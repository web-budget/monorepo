package br.com.webbudget.server.infrastructure.repository

import org.assertj.core.api.Assertions.assertThat
import org.jooq.Field
import org.jooq.OrderField
import org.jooq.SQLDialect
import org.jooq.impl.DSL
import org.junit.jupiter.api.Test
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort

class PagingTest {

    private val name = DSL.field(DSL.name("name"))
    private val createdOn = DSL.field(DSL.name("created_on"))
    private val id = DSL.field(DSL.name("id"))
    private val sortable: Map<String, Field<*>> = mapOf("name" to name, "createdOn" to createdOn)

    @Test
    fun `should order from the newest to the oldest when no sort is requested`() {

        assertThat(render(Pageable.unpaged())).containsExactly("created_on desc", "id desc")
        assertThat(render(PageRequest.of(0, 10))).containsExactly("created_on desc", "id desc")
    }

    @Test
    fun `should order from the newest to the oldest when only unknown properties are requested`() {

        val pageable = PageRequest.of(0, 10, Sort.by(Sort.Order.asc("unknown")))

        assertThat(render(pageable)).containsExactly("created_on desc", "id desc")
    }

    @Test
    fun `should sort by the name in both directions and break ties from the newest to the oldest`() {

        assertThat(render(PageRequest.of(0, 10, Sort.by(Sort.Order.asc("name")))))
            .containsExactly("lower(unaccent(name)) asc", "id desc")
        assertThat(render(PageRequest.of(0, 10, Sort.by(Sort.Order.desc("name")))))
            .containsExactly("lower(unaccent(name)) desc", "id desc")
    }

    @Test
    fun `should honor the requested creation order and ignore unknown properties`() {

        val pageable = PageRequest.of(0, 10, Sort.by(Sort.Order.asc("createdOn"), Sort.Order.desc("unknown")))

        assertThat(render(pageable)).containsExactly("created_on asc", "id desc")
    }

    private fun render(pageable: Pageable): List<String> =
        pageable.toOrderBy(sortable, createdOn, id).map { orderField: OrderField<*> ->
            DSL.using(SQLDialect.POSTGRES).renderInlined(orderField).replace("\"", "")
        }
}
