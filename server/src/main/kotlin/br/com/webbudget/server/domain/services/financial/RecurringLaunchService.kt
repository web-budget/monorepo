package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.LaunchRequest
import br.com.webbudget.server.domain.entities.financial.LaunchedRecurring
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.RecurringLaunchReport
import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import br.com.webbudget.server.domain.entities.financial.SkippedRecurring
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FINANCIAL_PERIOD_NOT_OPEN
import br.com.webbudget.server.domain.exceptions.ErrorCodes.LAUNCH_QUANTITY_OUT_OF_RANGE
import br.com.webbudget.server.domain.exceptions.ErrorCodes.LAUNCH_VALUE_ONLY_FOR_VARIABLE
import br.com.webbudget.server.domain.exceptions.ErrorCodes.RECURRING_MOVEMENT_FINISHED
import br.com.webbudget.server.domain.exceptions.ErrorCodes.RECURRING_MOVEMENT_INACTIVE
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.infrastructure.repository.financial.RecurringLaunchRepository
import br.com.webbudget.server.infrastructure.repository.financial.RecurringMovementRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
@Transactional(readOnly = true)
class RecurringLaunchService(
    private val movementService: MovementService,
    private val recurringMovementRepository: RecurringMovementRepository,
    private val recurringLaunchRepository: RecurringLaunchRepository
) {

    @Transactional
    fun launch(financialPeriod: FinancialPeriodReference, requests: List<LaunchRequest>): RecurringLaunchReport {

        if (!financialPeriod.isOpen()) {
            throw DomainException("The financial period is not open", FINANCIAL_PERIOD_NOT_OPEN)
        }

        val launched = mutableListOf<LaunchedRecurring>()
        val skipped = mutableListOf<SkippedRecurring>()

        for (request in requests) {

            val recurringMovement = recurringMovementRepository.findByExternalId(request.recurringMovement)
                ?: throw ResourceNotFoundException()

            if (request.value != null && recurringMovement.valueKind != RecurringMovement.ValueKind.VARIABLE) {
                throw DomainException("Only a variable recurring movement takes a value", LAUNCH_VALUE_ONLY_FOR_VARIABLE)
            }

            val reason = skipReason(recurringMovement, financialPeriod)

            if (reason != null) {
                skipped.add(SkippedRecurring(recurringMovement, reason))
                continue
            }

            launched.add(launchOne(recurringMovement, financialPeriod, request.value))
        }

        return RecurringLaunchReport(launched, skipped)
    }

    @Transactional
    fun launchExtra(
        recurringMovement: RecurringMovement,
        financialPeriod: FinancialPeriodReference,
        quantity: Int,
        value: BigDecimal?
    ): RecurringLaunchReport {

        if (!financialPeriod.isOpen()) {
            throw DomainException("The financial period is not open", FINANCIAL_PERIOD_NOT_OPEN)
        }

        if (!recurringMovement.active) {
            throw DomainException("The recurring movement is inactive", RECURRING_MOVEMENT_INACTIVE)
        }

        if (recurringMovement.finished) {
            throw DomainException("The recurring movement is finished", RECURRING_MOVEMENT_FINISHED)
        }

        if (value != null && recurringMovement.valueKind != RecurringMovement.ValueKind.VARIABLE) {
            throw DomainException("Only a variable recurring movement takes a value", LAUNCH_VALUE_ONLY_FOR_VARIABLE)
        }

        if (quantity !in 1..recurringMovement.maxExtraLaunches()) {
            throw DomainException("The quantity is out of the allowed range", LAUNCH_QUANTITY_OUT_OF_RANGE)
        }

        val firstInstallment = recurringMovement.nextInstallment!!

        val launched = (0 until quantity).map {
            launchOne(recurringMovement, financialPeriod, value, firstInstallment + it)
        }

        return RecurringLaunchReport(launched, emptyList())
    }

    private fun launchOne(
        recurringMovement: RecurringMovement,
        financialPeriod: FinancialPeriodReference,
        value: BigDecimal?,
        installment: Int = recurringMovement.nextInstallment!!
    ): LaunchedRecurring {

        val movement = Movement(
            name = recurringMovement.movementName(installment),
            type = recurringMovement.type,
            value = value ?: recurringMovement.launchValue,
            dueDate = financialPeriod.endingAt,
            classification = recurringMovement.classification,
            costCenter = recurringMovement.costCenter,
            financialPeriod = financialPeriod
        )

        movementService.create(movement)

        recurringLaunchRepository.insert(recurringMovement.id!!, financialPeriod.id, installment, movement.id!!)

        return LaunchedRecurring(recurringMovement, movement, installment)
    }

    private fun skipReason(recurringMovement: RecurringMovement, financialPeriod: FinancialPeriodReference): String? = when {
        !recurringMovement.active -> SKIPPED_INACTIVE
        recurringMovement.finished -> SKIPPED_FINISHED
        recurringLaunchRepository.exists(recurringMovement.id!!, financialPeriod.id) -> SKIPPED_ALREADY_LAUNCHED
        else -> null
    }

    companion object {
        const val SKIPPED_INACTIVE = "inactive"
        const val SKIPPED_FINISHED = "finished"
        const val SKIPPED_ALREADY_LAUNCHED = "already-launched-in-period"
    }
}
