package br.com.webbudget.server.application.controllers.advice

import br.com.webbudget.server.domain.exceptions.ApplicationException
import br.com.webbudget.server.domain.exceptions.DomainException
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.dao.InvalidDataAccessApiUsageException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/error-probe")
class ErrorProbeController {

    @GetMapping("/domain")
    fun domain(): ResponseEntity<Void> =
        throw DomainException("Domain rule broken", "some-rule", mapOf("field" to "value"))

    @GetMapping("/conflict")
    fun conflict(): ResponseEntity<Void> = throw DomainException.conflict(mapOf("field" to "value"))

    @GetMapping("/application")
    fun application(): ResponseEntity<Void> =
        throw ApplicationException("gone-for-good", HttpStatus.GONE, "Gone for good")

    @GetMapping("/illegal-argument")
    fun illegalArgument(): ResponseEntity<Void> = throw IllegalArgumentException("secret internal detail")

    @GetMapping("/data-integrity")
    fun dataIntegrity(): ResponseEntity<Void> = throw DataIntegrityViolationException("fk_secret_constraint")

    @GetMapping("/data-access")
    fun dataAccess(): ResponseEntity<Void> = throw InvalidDataAccessApiUsageException("secret query")

    @GetMapping("/unexpected")
    fun unexpected(): ResponseEntity<Void> = throw IllegalStateException("secret internal detail")

    @PostMapping("/validation")
    fun validation(@RequestBody @Valid probe: Probe): ResponseEntity<Void> = ResponseEntity.ok().build()

    data class Probe(
        @field:NotBlank(message = "is-null-or-blank")
        val name: String?
    )
}
