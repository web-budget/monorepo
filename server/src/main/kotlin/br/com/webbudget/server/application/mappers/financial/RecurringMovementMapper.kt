package br.com.webbudget.server.application.mappers.financial

import br.com.webbudget.server.application.payloads.financial.MovementClassificationView
import br.com.webbudget.server.application.payloads.financial.MovementCostCenterView
import br.com.webbudget.server.application.payloads.financial.CreationPreviewRecurringView
import br.com.webbudget.server.application.payloads.financial.FinancialPeriodCreationPreviewView
import br.com.webbudget.server.application.payloads.financial.PaymentCardView
import br.com.webbudget.server.application.payloads.financial.RecurringLaunchEntryView
import br.com.webbudget.server.application.payloads.financial.RecurringValuePeriodView
import br.com.webbudget.server.application.payloads.financial.RecurringLaunchForm
import br.com.webbudget.server.application.payloads.financial.RecurringLaunchView
import br.com.webbudget.server.application.payloads.financial.RecurringLaunchedView
import br.com.webbudget.server.application.payloads.financial.RecurringMovementCreateForm
import br.com.webbudget.server.application.payloads.financial.RecurringMovementUpdateForm
import br.com.webbudget.server.application.payloads.financial.RecurringMovementView
import br.com.webbudget.server.application.payloads.financial.RecurringSkippedView
import br.com.webbudget.server.application.payloads.financial.RecurringValueView
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodCreationPreview
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.LaunchRequest
import br.com.webbudget.server.domain.entities.financial.RecurringLaunchEntry
import br.com.webbudget.server.domain.entities.financial.RecurringLaunchReport
import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import br.com.webbudget.server.domain.entities.financial.RecurringValue
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import org.springframework.stereotype.Component

@Component
class RecurringMovementMapper(
    private val movementMapper: MovementMapper,
    private val movementReferenceRepository: MovementReferenceRepository
) {

    fun mapToView(recurringMovement: RecurringMovement): RecurringMovementView = RecurringMovementView(
        id = recurringMovement.externalId!!,
        name = recurringMovement.name,
        type = recurringMovement.type.name,
        valueKind = recurringMovement.valueKind.name,
        value = recurringMovement.value,
        suggestedValue = recurringMovement.launchValue,
        installments = recurringMovement.installments,
        firstInstallment = recurringMovement.firstInstallment,
        launchedInstallments = recurringMovement.launchedInstallments,
        nextInstallment = recurringMovement.nextInstallment,
        finished = recurringMovement.finished,
        ended = recurringMovement.ended,
        autoLaunch = recurringMovement.autoLaunch,
        active = recurringMovement.active,
        classification = recurringMovement.classification.let {
            MovementClassificationView(it.externalId, it.name, it.type)
        },
        costCenter = recurringMovement.costCenter.let { MovementCostCenterView(it.externalId, it.name, it.fullName) },
        card = recurringMovement.card?.let { PaymentCardView(it.externalId, it.name, it.lastFourDigits) },
        launchedInPeriod = recurringMovement.launchedInPeriod,
        createdOn = recurringMovement.createdOn!!
    )

    fun mapToView(value: RecurringValue): RecurringValueView = RecurringValueView(
        value = value.value,
        reason = value.reason,
        validFrom = value.validFrom,
        validFromPeriod = value.validFromPeriod?.let { mapToPeriodView(it) },
        current = value.current
    )

    fun mapToView(entry: RecurringLaunchEntry): RecurringLaunchEntryView = RecurringLaunchEntryView(
        financialPeriod = mapToPeriodView(entry.financialPeriod),
        installment = entry.installment,
        movement = entry.movementId,
        value = entry.value,
        status = entry.status.name,
        valuePaid = entry.valuePaid
    )

    fun mapToView(preview: FinancialPeriodCreationPreview): FinancialPeriodCreationPreviewView =
        FinancialPeriodCreationPreviewView(
            recurringMovements = preview.recurringMovements.map {
                CreationPreviewRecurringView(
                    id = it.externalId!!,
                    name = it.name,
                    type = it.type.name,
                    value = it.launchValue,
                    installment = if (it.installments != null) it.nextInstallment else null,
                    installments = it.installments
                )
            },
            invoices = preview.cards.map { PaymentCardView(it.externalId, it.name, it.lastFourDigits) }
        )

    private fun mapToPeriodView(period: FinancialPeriodReference) =
        RecurringValuePeriodView(period.externalId, period.name, period.startingAt)


    fun mapToView(report: RecurringLaunchReport): RecurringLaunchView = RecurringLaunchView(
        launched = report.launched.map {
            RecurringLaunchedView(
                recurringMovement = it.recurringMovement.externalId!!,
                installment = it.installment,
                movement = movementMapper.mapToListView(it.movement)
            )
        },
        skipped = report.skipped.map {
            RecurringSkippedView(it.recurringMovement.externalId!!, it.recurringMovement.name, it.reason)
        }
    )

    fun mapToDomain(form: RecurringMovementCreateForm): RecurringMovement = RecurringMovement(
        name = form.name!!,
        type = form.type!!,
        valueKind = form.valueKind!!,
        value = form.value!!,
        installments = form.installments,
        firstInstallment = form.firstInstallment ?: 1,
        autoLaunch = form.autoLaunch!!,
        active = true,
        classification = movementReferenceRepository.findClassification(form.classification!!)
            ?: throw ResourceNotFoundException(),
        costCenter = movementReferenceRepository.findCostCenter(form.costCenter!!)
            ?: throw ResourceNotFoundException(),
        card = form.card?.let { movementReferenceRepository.findCard(it) ?: throw ResourceNotFoundException() }
    )

    fun mapToDomain(form: RecurringMovementUpdateForm, recurringMovement: RecurringMovement): RecurringMovement =
        recurringMovement.apply {
            this.name = form.name!!
            this.active = form.active!!
            this.installments = form.installments
            this.autoLaunch = form.autoLaunch!!
            this.classification = movementReferenceRepository.findClassification(form.classification!!)
                ?: throw ResourceNotFoundException()
            this.costCenter = movementReferenceRepository.findCostCenter(form.costCenter!!)
                ?: throw ResourceNotFoundException()
            this.card = form.card?.let { movementReferenceRepository.findCard(it) ?: throw ResourceNotFoundException() }
        }

    fun mapToDomain(form: RecurringLaunchForm): List<LaunchRequest> =
        form.recurringMovements!!.map { LaunchRequest(it.id!!, it.value) }
}
