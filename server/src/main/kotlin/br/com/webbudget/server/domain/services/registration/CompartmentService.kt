package br.com.webbudget.server.domain.services.registration

import br.com.webbudget.server.domain.entities.registration.Compartment
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnDeleteValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.domain.validators.registration.CompartmentValidator
import br.com.webbudget.server.infrastructure.repository.financial.WalletEntryRepository
import br.com.webbudget.server.infrastructure.repository.registration.CompartmentRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class CompartmentService(
    private val compartmentRepository: CompartmentRepository,
    private val walletEntryRepository: WalletEntryRepository,
    @OnCreateValidation
    private val creationValidators: List<CompartmentValidator>,
    @OnUpdateValidation
    private val updateValidators: List<CompartmentValidator>,
    @OnDeleteValidation
    private val deletionValidators: List<CompartmentValidator>
) {

    @Transactional
    fun create(compartment: Compartment): UUID {

        creationValidators.forEach { it.validate(compartment) }

        return compartmentRepository.insert(compartment).externalId!!
    }

    @Transactional
    fun update(compartment: Compartment): Compartment {

        updateValidators.forEach { it.validate(compartment) }

        return compartmentRepository.update(compartment)
    }

    @Transactional
    fun delete(compartment: Compartment) {

        walletEntryRepository.lockWallets(listOf(compartment.wallet.id!!))

        val current = compartmentRepository.findByExternalId(compartment.wallet, compartment.externalId!!)
            ?: throw ResourceNotFoundException()

        deletionValidators.forEach { it.validate(current) }

        compartmentRepository.delete(current)
    }
}
