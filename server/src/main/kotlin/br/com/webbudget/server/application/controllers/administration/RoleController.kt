package br.com.webbudget.server.application.controllers.administration

import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.administration.RoleRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequiresRole(Role.ADMINISTRATION)
@RequestMapping("/administration/roles")
class RoleController(
    private val roleRepository: RoleRepository
) {

    @GetMapping
    fun getAll(): ResponseEntity<List<String>> = ResponseEntity.ok(roleRepository.findAll().map { it.name })
}
