import kotlinx.kover.gradle.plugin.dsl.AggregationType.COVERED_PERCENTAGE
import kotlinx.kover.gradle.plugin.dsl.CoverageUnit.BRANCH
import kotlinx.kover.gradle.plugin.dsl.CoverageUnit.INSTRUCTION
import kotlinx.kover.gradle.plugin.dsl.CoverageUnit.LINE
import org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_25
import org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_2_4

plugins {
    kotlin("jvm") version "2.4.21"
    kotlin("plugin.spring") version "2.4.10"

    id("org.springframework.boot") version "4.1.2"
    id("io.spring.dependency-management") version "1.1.7"
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

dependencies {
    // spring stuff
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-jooq")
    implementation("org.springframework.boot:spring-boot-starter-liquibase")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-webmvc")

    // logging
    implementation("io.github.oshai:kotlin-logging-jvm:$kotlinLoggingJvmVersion")

    // kotlin thing
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("tools.jackson.module:jackson-module-kotlin")

    // dev utils
    developmentOnly("org.springframework.boot:spring-boot-docker-compose")
    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")

    // database
    runtimeOnly("org.postgresql:postgresql")

    // testing
    testImplementation("org.springframework.boot:spring-boot-starter-actuator-test")
    testImplementation("org.springframework.boot:spring-boot-starter-jooq-test")
    testImplementation("org.springframework.boot:spring-boot-starter-liquibase-test")
    testImplementation("org.springframework.boot:spring-boot-starter-security-test")
    testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")

    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")

    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")

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
                    minValue = 0
                }
                bound {
                    coverageUnits = INSTRUCTION
                    aggregationForGroup = COVERED_PERCENTAGE
                    minValue = 0
                }
                bound {
                    coverageUnits = BRANCH
                    aggregationForGroup = COVERED_PERCENTAGE
                    minValue = 0
                }
            }
        }
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
    maxParallelForks = 4
}
