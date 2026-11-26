package br.com.webbudget.server.application.payloads.administration

import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.domain.entities.administration.InitialSetupOption
import br.com.webbudget.server.domain.services.administration.InitialSetupResult
import br.com.webbudget.server.domain.services.administration.InitialSetupStatus
import br.com.webbudget.server.domain.services.administration.ItemCounts
import jakarta.validation.constraints.NotNull

data class InitialSetupForm(
    @field:NotNull(message = IS_NULL)
    val option: InitialSetupOption?
)

data class InitialSetupItemsView(
    val toCreate: Int,
    val existing: Int
)

data class InitialSetupStatusView(
    val pending: Boolean,
    val toCreate: Int,
    val existing: Int,
    val costCenters: InitialSetupItemsView,
    val classifications: InitialSetupItemsView
) {

    companion object {

        fun from(status: InitialSetupStatus) = InitialSetupStatusView(
            pending = status.pending,
            toCreate = status.template.created,
            existing = status.template.existing,
            costCenters = status.template.costCenters.toView(),
            classifications = status.template.classifications.toView()
        )

        private fun ItemCounts.toView() = InitialSetupItemsView(toCreate = created, existing = existing)
    }
}

data class InitialSetupCreatedView(
    val created: Int,
    val existing: Int
)

data class InitialSetupResultView(
    val option: InitialSetupOption,
    val created: Int,
    val existing: Int,
    val costCenters: InitialSetupCreatedView,
    val classifications: InitialSetupCreatedView
) {

    companion object {

        fun from(result: InitialSetupResult) = InitialSetupResultView(
            option = result.option,
            created = result.counts.created,
            existing = result.counts.existing,
            costCenters = result.counts.costCenters.toView(),
            classifications = result.counts.classifications.toView()
        )

        private fun ItemCounts.toView() = InitialSetupCreatedView(created = created, existing = existing)
    }
}
