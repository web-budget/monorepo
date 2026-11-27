package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import org.springframework.core.io.ByteArrayResource
import org.springframework.http.MediaType
import org.springframework.http.client.MultipartBodyBuilder
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec

internal const val IMPORTS_URL = "/private/v1/financial/imports"

internal const val OPEN_PERIOD = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
internal const val CLOSED_PERIOD = "6531c609-577b-4a45-82a9-debe0b53eeab"
internal const val OTHER_OPEN_PERIOD = "6248abb7-a8ad-4d2b-a0a4-0417b98cb008"

internal const val CARD = "3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b01"
internal const val OTHER_CARD = "3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b02"

internal const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
internal const val INACTIVE_WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a02"
internal const val OTHER_WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a05"

internal const val HOME_COST_CENTER = "bfe5413f-1cc6-46cb-967c-8a3b11046747"
internal const val INACTIVE_COST_CENTER = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a04"
internal const val EXPENSE_CLASSIFICATION = "503cee43-583e-4df5-a9db-8bf049cf6a8d"
internal const val INCOME_CLASSIFICATION = "fd17c780-50b0-4669-9c1c-272c6f5d3413"
internal const val INACTIVE_CLASSIFICATION = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a03"

internal const val PIZZA = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c01"
internal const val GYM_MOVEMENT = "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a04"
internal const val SALARY_MOVEMENT = "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a02"
internal const val INVOICE_PAYMENT_MOVEMENT = "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a03"
internal const val OUTGOING_TRANSFER = "0c6e0c4a-6f3e-4c55-8a39-0d3c1c1f9b01"

internal const val SAVED_IMPORT = "1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f01"
internal const val FAILED_IMPORT = "1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f02"
internal const val UNDONE_IMPORT = "1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f03"
internal const val PROCESSING_IMPORT = "1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f04"
internal const val SAVED_LINE = "2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a01"

abstract class ImportTestSupport : BaseIntegrationTest() {

    protected fun upload(
        fileName: String,
        card: String? = null,
        wallet: String? = null,
        period: String = OPEN_PERIOD,
        content: ByteArray = resource(fileName)
    ): String {

        var id: String? = null

        attempt(fileName, card, wallet, period, content)
            .expectStatus().isAccepted
            .expectBody(Map::class.java)
            .value { body -> id = body!!["id"] as String }

        return id!!
    }

    protected fun attempt(
        fileName: String,
        card: String? = null,
        wallet: String? = null,
        period: String = OPEN_PERIOD,
        content: ByteArray = resource(fileName)
    ): ResponseSpec {

        val body = MultipartBodyBuilder()
            .also { builder ->
                builder.part("financialPeriod", period)
                card?.let { builder.part("card", it) }
                wallet?.let { builder.part("wallet", it) }
                builder.part("file", ByteArrayResource(content)).filename(fileName)
            }
            .build()

        return restTestClient.post()
            .uri(IMPORTS_URL)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(body)
            .exchange()
    }

    protected fun lines(id: Any): List<Map<String, Any?>> {

        var content: List<Map<String, Any?>> = emptyList()

        restTestClient.get().uri("$IMPORTS_URL/$id/lines?size=50").exchange()
            .expectStatus().isOk
            .expectBody(Map::class.java)
            .value { body ->
                @Suppress("UNCHECKED_CAST")
                content = body!!["content"] as List<Map<String, Any?>>
            }

        return content
    }

    protected fun candidates(id: Any, line: Map<String, Any?>, vararg change: Pair<String, String>): List<Map<String, Any?>> {

        if (change.isNotEmpty()) {
            patchLine(id, line, """{"${change[0].first}": "${change[0].second}"}""").expectStatus().isOk
        }

        var content: List<Map<String, Any?>> = emptyList()

        restTestClient.get().uri("$IMPORTS_URL/$id/lines/${line["id"]}/candidates").exchange()
            .expectStatus().isOk
            .expectBody(List::class.java)
            .value { body ->
                @Suppress("UNCHECKED_CAST")
                content = body as List<Map<String, Any?>>
            }

        return content
    }

    protected fun patchLine(id: Any, line: Map<String, Any?>, body: String) = restTestClient.patch()
        .uri("$IMPORTS_URL/$id/lines/${line["id"]}")
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()

    protected fun patchBatch(id: Any, body: String) = restTestClient.patch()
        .uri("$IMPORTS_URL/$id/lines")
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()

    protected fun resource(name: String): ByteArray =
        requireNotNull(javaClass.getResourceAsStream("/ofx/$name")).readBytes()

    @Suppress("UNCHECKED_CAST")
    protected fun Any?.asMap(): Map<String, Any?> = this as Map<String, Any?>

    protected fun ResponseSpec.isBadRequest(error: String) {
        expectStatus().isBadRequest.expectBody().jsonPath("$.error").isEqualTo(error)
    }

    protected fun ResponseSpec.isConflict(error: String) {
        expectStatus().isEqualTo(409).expectBody().jsonPath("$.error").isEqualTo(error)
    }

    protected fun ResponseSpec.isNotFound() {
        expectStatus().isNotFound
    }
}
