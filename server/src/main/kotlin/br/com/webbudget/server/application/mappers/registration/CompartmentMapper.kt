package br.com.webbudget.server.application.mappers.registration

import br.com.webbudget.server.application.payloads.registration.CompartmentCreateForm
import br.com.webbudget.server.application.payloads.registration.CompartmentUpdateForm
import br.com.webbudget.server.application.payloads.registration.CompartmentView
import br.com.webbudget.server.domain.entities.registration.Compartment
import br.com.webbudget.server.domain.entities.registration.Wallet
import org.springframework.stereotype.Component
import java.time.LocalDate

@Component
class CompartmentMapper {

    fun mapToView(compartment: Compartment, today: LocalDate = LocalDate.now()): CompartmentView = CompartmentView(
        id = compartment.externalId!!,
        name = compartment.name,
        type = compartment.type,
        balance = compartment.balance,
        statementEntryCount = compartment.statementEntryCount,
        achieved = compartment.isAchieved(),
        overdue = compartment.isOverdue(today),
        description = compartment.description,
        targetValue = compartment.targetValue,
        targetDate = compartment.targetDate,
        progress = compartment.progress(),
        monthlyAmount = compartment.monthlyAmount(today)
    )

    fun mapToDomain(form: CompartmentCreateForm, wallet: Wallet): Compartment = Compartment(
        name = form.name!!,
        type = form.type!!,
        wallet = wallet,
        description = form.description,
        targetValue = form.targetValue,
        targetDate = form.targetDate
    )

    fun mapToDomain(form: CompartmentUpdateForm, compartment: Compartment): Compartment = compartment.apply {
        this.name = form.name!!
        this.description = form.description
        this.targetValue = form.targetValue
        this.targetDate = form.targetDate
    }
}
