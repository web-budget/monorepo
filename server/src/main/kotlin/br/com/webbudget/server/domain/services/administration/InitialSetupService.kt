package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.InitialSetupChoice
import br.com.webbudget.server.domain.entities.administration.InitialSetupOption
import br.com.webbudget.server.domain.entities.registration.Classification
import br.com.webbudget.server.domain.entities.registration.CostCenter
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INITIAL_SETUP_ALREADY_CHOSEN
import br.com.webbudget.server.domain.security.CurrentUser
import br.com.webbudget.server.domain.security.CurrentUserProvider
import br.com.webbudget.server.domain.services.registration.ClassificationService
import br.com.webbudget.server.domain.services.registration.CostCenterService
import br.com.webbudget.server.infrastructure.repository.administration.InitialSetupRepository
import br.com.webbudget.server.infrastructure.repository.registration.ClassificationRepository
import br.com.webbudget.server.infrastructure.repository.registration.CostCenterRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDateTime

@Service
@Transactional(readOnly = true)
class InitialSetupService(
    private val currentUserProvider: CurrentUserProvider,
    private val initialSetupRepository: InitialSetupRepository,
    private val costCenterService: CostCenterService,
    private val costCenterRepository: CostCenterRepository,
    private val classificationService: ClassificationService,
    private val classificationRepository: ClassificationRepository
) {

    fun isPending(user: CurrentUser): Boolean = user.isMainAdmin() && initialSetupRepository.find() == null

    fun status(): InitialSetupStatus = InitialSetupStatus(
        pending = initialSetupRepository.find() == null,
        template = applyTemplate(persist = false)
    )

    @Transactional
    fun choose(option: InitialSetupOption): InitialSetupResult {

        val user = currentUserProvider.getCurrentUser()
        val choice = InitialSetupChoice(option, user.id, LocalDateTime.now())

        if (!initialSetupRepository.insertIfAbsent(choice)) {
            throw DomainException.conflict(
                message = "The initial setup was already answered",
                error = INITIAL_SETUP_ALREADY_CHOSEN
            )
        }

        val counts = if (option == InitialSetupOption.USE_TEMPLATE) {
            applyTemplate(persist = true)
        } else {
            TemplateCounts(ItemCounts(0, 0), ItemCounts(0, 0))
        }

        return InitialSetupResult(option, counts)
    }

    private fun applyTemplate(persist: Boolean): TemplateCounts {

        var costCentersCreated = 0
        var costCentersExisting = 0

        for (item in InitialSetupTemplate.costCenters) {

            val rootExists = costCenterRepository.existsByName(item.name)
            val root = when {
                rootExists -> costCenterRepository.findRootByName(item.name)
                persist -> createCostCenter(item.name, item.expenseBudgetPercentage, null)
                else -> null
            }

            if (rootExists) costCentersExisting++ else costCentersCreated++

            for (childName in item.children) {

                val childExists = (rootExists && root == null) ||
                    costCenterRepository.existsByFullName("${item.name} > $childName")

                if (childExists) {
                    costCentersExisting++
                } else {
                    costCentersCreated++
                    if (persist) {
                        createCostCenter(childName, null, requireNotNull(root))
                    }
                }
            }
        }

        var classificationsCreated = 0
        var classificationsExisting = 0

        for (item in InitialSetupTemplate.classifications) {
            if (classificationRepository.existsByName(item.name)) {
                classificationsExisting++
            } else {
                classificationsCreated++
                if (persist) {
                    classificationService.create(Classification(name = item.name, type = item.type))
                }
            }
        }

        return TemplateCounts(
            costCenters = ItemCounts(costCentersCreated, costCentersExisting),
            classifications = ItemCounts(classificationsCreated, classificationsExisting)
        )
    }

    private fun createCostCenter(name: String, expenseBudgetPercentage: BigDecimal?, parent: CostCenter?): CostCenter {

        val externalId = costCenterService.create(
            CostCenter(name = name, fullName = name, expenseBudgetPercentage = expenseBudgetPercentage, parent = parent)
        )

        return requireNotNull(costCenterRepository.findByExternalId(externalId))
    }
}

data class ItemCounts(val created: Int, val existing: Int)

data class TemplateCounts(val costCenters: ItemCounts, val classifications: ItemCounts) {

    val created: Int get() = costCenters.created + classifications.created

    val existing: Int get() = costCenters.existing + classifications.existing
}

data class InitialSetupStatus(val pending: Boolean, val template: TemplateCounts)

data class InitialSetupResult(val option: InitialSetupOption, val counts: TemplateCounts)
