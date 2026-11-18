package br.com.webbudget.server.infrastructure.repository.registration

import br.com.webbudget.server.domain.entities.registration.Wallet
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.jooq.DSLContext
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

@Repository
class WalletRepository(
    private val dsl: DSLContext
) {

    fun findByExternalId(externalId: UUID): Wallet? {
        val wallets = WALLETS.`as`("wallets")
        return dsl.selectFrom(wallets)
            .where(wallets.EXTERNAL_ID.eq(externalId))
            .fetchOne { record -> record.toWallet() }
    }

    fun findAll(filter: String?, active: Boolean?, pageable: Pageable): PagedModel<Wallet> {

        val wallets = WALLETS.`as`("wallets")

        val textCondition = filter?.let { text ->
            anyOf(
                listOf(
                    containsIgnoreCase(wallets.NAME, text),
                    containsIgnoreCase(wallets.DESCRIPTION, text),
                    containsIgnoreCase(wallets.BANK, text),
                    wallets.AGENCY.eq(text),
                    wallets.NUMBER.eq(text)
                )
            )
        }

        val condition = allOf(listOfNotNull(active?.let { wallets.ACTIVE.eq(it) }, textCondition))

        val sortable = mapOf(
            "name" to wallets.NAME,
            "type" to wallets.TYPE,
            "currentBalance" to wallets.CURRENT_BALANCE,
            "active" to wallets.ACTIVE,
            "description" to wallets.DESCRIPTION,
            "bank" to wallets.BANK,
            "agency" to wallets.AGENCY,
            "number" to wallets.NUMBER,
            "createdOn" to wallets.CREATED_ON
        )

        val content = dsl.selectFrom(wallets)
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, wallets.ID.asc()))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch { record -> record.toWallet() }

        val total = dsl.fetchCount(wallets, condition)

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun existsByName(name: String): Boolean = dsl.fetchExists(
        dsl.selectOne().from(WALLETS).where(WALLETS.NAME.equalIgnoreCase(name))
    )

    fun existsByNameAndExternalIdNot(name: String, externalId: UUID): Boolean = dsl.fetchExists(
        dsl.selectOne().from(WALLETS)
            .where(WALLETS.NAME.equalIgnoreCase(name))
            .and(WALLETS.EXTERNAL_ID.ne(externalId))
    )

    fun existsByBankInfo(bank: String?, agency: String?, number: String?): Boolean = dsl.fetchExists(
        dsl.selectOne().from(WALLETS)
            .where(WALLETS.BANK.eq(bank))
            .and(WALLETS.AGENCY.eq(agency))
            .and(WALLETS.NUMBER.eq(number))
    )

    fun existsByBankInfoAndExternalIdNot(bank: String?, agency: String?, number: String?, externalId: UUID): Boolean =
        dsl.fetchExists(
            dsl.selectOne().from(WALLETS)
                .where(WALLETS.BANK.eq(bank))
                .and(WALLETS.AGENCY.eq(agency))
                .and(WALLETS.NUMBER.eq(number))
                .and(WALLETS.EXTERNAL_ID.ne(externalId))
        )

    fun insert(wallet: Wallet): Wallet {
        val record = dsl.insertInto(WALLETS)
            .set(WALLETS.EXTERNAL_ID, UUID.randomUUID())
            .set(WALLETS.VERSION, 0)
            .set(WALLETS.CREATED_ON, LocalDateTime.now())
            .set(WALLETS.NAME, wallet.name)
            .set(WALLETS.TYPE, wallet.type.name)
            .set(WALLETS.CURRENT_BALANCE, wallet.currentBalance)
            .set(WALLETS.ACTIVE, wallet.active)
            .set(WALLETS.DESCRIPTION, wallet.description)
            .set(WALLETS.BANK, wallet.bank)
            .set(WALLETS.AGENCY, wallet.agency)
            .set(WALLETS.NUMBER, wallet.number)
            .returning()
            .fetchSingle()

        wallet.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return wallet
    }

    fun update(wallet: Wallet): Wallet {
        val record = dsl.update(WALLETS)
            .set(WALLETS.NAME, wallet.name)
            .set(WALLETS.TYPE, wallet.type.name)
            .set(WALLETS.ACTIVE, wallet.active)
            .set(WALLETS.DESCRIPTION, wallet.description)
            .set(WALLETS.BANK, wallet.bank)
            .set(WALLETS.AGENCY, wallet.agency)
            .set(WALLETS.NUMBER, wallet.number)
            .set(WALLETS.VERSION, WALLETS.VERSION.plus(1))
            .set(WALLETS.LAST_UPDATE, LocalDateTime.now())
            .where(WALLETS.ID.eq(wallet.id))
            .and(WALLETS.VERSION.eq(wallet.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        wallet.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return wallet
    }

    fun delete(wallet: Wallet) {
        dsl.deleteFrom(WALLETS)
            .where(WALLETS.ID.eq(wallet.id))
            .execute()
    }
}
