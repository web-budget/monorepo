import liquibase.Liquibase
import liquibase.database.DatabaseFactory
import liquibase.database.jvm.JdbcConnection
import liquibase.resource.DirectoryResourceAccessor
import kotlinx.kover.gradle.plugin.dsl.AggregationType.COVERED_PERCENTAGE
import kotlinx.kover.gradle.plugin.dsl.CoverageUnit.BRANCH
import kotlinx.kover.gradle.plugin.dsl.CoverageUnit.INSTRUCTION
import kotlinx.kover.gradle.plugin.dsl.CoverageUnit.LINE
import org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_25
import org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_2_4
import org.springframework.boot.gradle.tasks.run.BootRun
import org.jooq.codegen.gradle.CodegenPluginExtension
import org.jooq.meta.jaxb.Jdbc
import org.testcontainers.postgresql.PostgreSQLContainer
import org.testcontainers.utility.DockerImageName
import java.security.MessageDigest
import java.sql.DriverManager

buildscript {
    repositories {
        mavenCentral()
    }
    dependencies {
        classpath("org.testcontainers:testcontainers-postgresql:2.0.5")
        classpath("org.liquibase:liquibase-core:5.0.4")
        classpath("org.postgresql:postgresql:42.7.14")
    }
}

plugins {
    kotlin("jvm") version "2.4.21"
    kotlin("plugin.spring") version "2.4.21"

    id("org.springframework.boot") version "4.1.2"
    id("io.spring.dependency-management") version "1.1.7"
    id("org.jooq.jooq-codegen-gradle") version "3.21.7"
    id("org.jetbrains.kotlinx.kover") version "0.9.9"
}

group = "br.com.webbudget"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
}

val kotlinLoggingJvmVersion = "8.0.4"
val postgresDriverVersion = "42.7.14"
val greenMailVersion = "2.1.14"
val totpVersion = "1.7.1"
val zxingVersion = "3.5.4"

dependencies {
    // spring stuff
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-jooq")
    implementation("org.springframework.boot:spring-boot-starter-liquibase")
    implementation("org.springframework.boot:spring-boot-starter-mail")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.thymeleaf:thymeleaf-spring6")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-webmvc")

    developmentOnly("org.springframework.boot:spring-boot-docker-compose")

    implementation("org.springframework.data:spring-data-commons")

    // totp
    implementation("dev.samstevens.totp:totp:$totpVersion")
    implementation("com.google.zxing:core:$zxingVersion")
    implementation("com.google.zxing:javase:$zxingVersion")

    // logging
    implementation("io.github.oshai:kotlin-logging-jvm:$kotlinLoggingJvmVersion")

    // kotlin things
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("tools.jackson.module:jackson-module-kotlin")

    // database
    runtimeOnly("org.postgresql:postgresql")
    jooqCodegen("org.postgresql:postgresql:$postgresDriverVersion")

    // testing
    testImplementation("org.springframework.boot:spring-boot-starter-mail-test")
    testImplementation("org.springframework.boot:spring-boot-starter-security-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")


    testImplementation("org.testcontainers:testcontainers-postgresql")

    testImplementation("com.icegreen:greenmail:$greenMailVersion")

    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
    compilerOptions {
        jvmTarget.set(JVM_25)
        languageVersion.set(KOTLIN_2_4)
        apiVersion.set(KOTLIN_2_4)
        freeCompilerArgs.addAll(
            "-Xjsr305=strict",
            "-Xemit-jvm-type-annotations"
        )
    }
}

kover {
    reports {
        filters {
            excludes {
                packages("br.com.webbudget.server.jooq")
                classes(
                    "br.com.webbudget.server.ServerApplication",
                    "br.com.webbudget.server.ServerApplicationKt"
                )
            }
        }

        // the floors start at 0 and go up at the end of each porting subtask, never down
        verify {
            rule {
                bound {
                    coverageUnits = LINE
                    aggregationForGroup = COVERED_PERCENTAGE
                    minValue = 99
                }
                bound {
                    coverageUnits = INSTRUCTION
                    aggregationForGroup = COVERED_PERCENTAGE
                    minValue = 99
                }
                bound {
                    coverageUnits = BRANCH
                    aggregationForGroup = COVERED_PERCENTAGE
                    minValue = 92
                }
            }
        }
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
    maxParallelForks = 4
}

tasks.named<BootRun>("bootRun") {
    environment("SPRING_PROFILES_ACTIVE", System.getenv("SPRING_PROFILES_ACTIVE") ?: "dev")
}

jooq {
    configuration {
        generator {
            name = "org.jooq.codegen.KotlinGenerator"

            database {
                name = "org.jooq.meta.postgres.PostgresDatabase"

                schemata {
                    schema {
                        inputSchema = "administration"
                    }
                    schema {
                        inputSchema = "registration"
                    }
                    schema {
                        inputSchema = "financial"
                    }
                }
            }

            target {
                packageName = "br.com.webbudget.server.jooq"
                directory = "build/generated-sources/jooq/main"
            }
        }
    }
}

val jooqDb = PostgreSQLContainer(DockerImageName.parse("postgres:18-alpine"))

val changelogDir = file("src/main/resources/db/changelog")
val jooqCodegenMarker = layout.buildDirectory.file("jooq-codegen-changelog.sha256")

fun changelogDigest(): String {
    val digest = MessageDigest.getInstance("SHA-256")
    changelogDir.walkTopDown().filter { it.isFile }.sortedBy { it.path }.forEach { changelogFile ->
        digest.update(changelogFile.readBytes())
    }
    return digest.digest().joinToString("") { byte -> "%02x".format(byte) }
}

fun changelogUnchangedSinceLastCodegen(): Boolean {
    val markerFile = jooqCodegenMarker.get().asFile
    return markerFile.exists() && markerFile.readText() == changelogDigest()
}

val startJooqDb by tasks.registering {
    description = "starts a disposable postgres with the changelog applied to generate the jooq classes"
    onlyIf { !changelogUnchangedSinceLastCodegen() }
    doLast {
        jooqDb.start()

        DriverManager.getConnection(jooqDb.jdbcUrl, jooqDb.username, jooqDb.password).use { connection ->
            val database = DatabaseFactory
                .getInstance()
                .findCorrectDatabaseImplementation(JdbcConnection(connection))

            val resourceAccessor = DirectoryResourceAccessor(File(projectDir, "src/main/resources"))

            Liquibase("db/changelog/db.changelog-master.xml", resourceAccessor, database).update()
        }

        project.extensions.getByType(CodegenPluginExtension::class.java)
            .executions.getByName("")
            .configuration
            .withJdbc(
                Jdbc()
                    .withDriver("org.postgresql.Driver")
                    .withUrl(jooqDb.jdbcUrl)
                    .withUser(jooqDb.username)
                    .withPassword(jooqDb.password)
            )
    }
}

val stopJooqDb by tasks.registering {
    description = "stops the disposable postgres used to generate the jooq classes"
    onlyIf { startJooqDb.get().didWork }
    doLast {
        jooqDb.stop()
    }
}

startJooqDb {
    finalizedBy(stopJooqDb)
}

tasks.named("jooqCodegen") {
    dependsOn(startJooqDb)
    finalizedBy(stopJooqDb)
    onlyIf { startJooqDb.get().didWork }
    doLast {
        jooqCodegenMarker.get().asFile.apply {
            parentFile.mkdirs()
            writeText(changelogDigest())
        }
    }
}

tasks.named("compileKotlin") {
    dependsOn("jooqCodegen")
}
