package br.com.webbudget.server.domain.services.administration

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource

class DeviceLabelTest {

    @ParameterizedTest
    @CsvSource(
        delimiter = '|',
        value = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36|Chrome · Windows",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0|Edge · Windows",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 OPR/105.0|Opera · Windows",
            "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0|Firefox · Linux",
            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36|Chrome · Android",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1|Safari · iOS",
            "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1|Safari · iOS",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15|Safari · macOS",
            "Opera/9.80 (Windows NT 6.1) Presto/2.12|Opera · Windows",
            "curl/8.0.1|Browser"
        ]
    )
    fun `should describe the browser and the system of the user agent`(userAgent: String, expected: String) {

        assertThat(DeviceLabel.from(userAgent)).isEqualTo(expected)
    }

    @Test
    fun `should describe a request without user agent as an unknown device`() {

        assertThat(DeviceLabel.from(null)).isEqualTo("Unknown device")
        assertThat(DeviceLabel.from("  ")).isEqualTo("Unknown device")
    }

    @Test
    fun `should keep the label inside the column size`() {

        assertThat(DeviceLabel.from("Chrome/1 " + "x".repeat(500)).length).isLessThanOrEqualTo(100)
    }
}
