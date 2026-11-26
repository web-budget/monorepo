package br.com.webbudget.server.infrastructure.repository.administration

import br.com.webbudget.server.domain.entities.administration.InitialSetupChoice
import br.com.webbudget.server.domain.entities.administration.InitialSetupOption
import br.com.webbudget.server.jooq.administration.tables.references.INITIAL_SETUP
import org.jooq.DSLContext
import org.springframework.stereotype.Repository

@Repository
class InitialSetupRepository(
    private val dsl: DSLContext
) {

    fun find(): InitialSetupChoice? = dsl.selectFrom(INITIAL_SETUP)
        .fetchOne()
        ?.let { record ->
            InitialSetupChoice(
                option = InitialSetupOption.valueOf(record.choice!!),
                chosenBy = record.idUser!!,
                chosenOn = record.chosenOn!!
            )
        }

    fun insertIfAbsent(choice: InitialSetupChoice): Boolean = dsl.insertInto(INITIAL_SETUP)
        .set(INITIAL_SETUP.CHOICE, choice.option.name)
        .set(INITIAL_SETUP.ID_USER, choice.chosenBy)
        .set(INITIAL_SETUP.CHOSEN_ON, choice.chosenOn)
        .onConflictDoNothing()
        .execute() == 1
}
