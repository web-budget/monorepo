package br.com.webbudget.server.domain.services.administration

object DeviceLabel {

    private const val UNKNOWN_DEVICE = "Unknown device"
    private const val UNKNOWN_BROWSER = "Browser"
    private const val MAX_LENGTH = 100

    private val browsers = listOf(
        "Edg/" to "Edge",
        "OPR/" to "Opera",
        "Opera" to "Opera",
        "Firefox/" to "Firefox",
        "Chrome/" to "Chrome"
    )

    private val operatingSystems = listOf(
        "Windows" to "Windows",
        "Android" to "Android",
        "iPhone" to "iOS",
        "iPad" to "iOS",
        "Mac OS X" to "macOS",
        "Linux" to "Linux"
    )

    fun from(userAgent: String?): String {

        if (userAgent.isNullOrBlank()) {
            return UNKNOWN_DEVICE
        }

        val browser = browsers.firstOrNull { (marker, _) -> userAgent.contains(marker) }?.second
            ?: "Safari".takeIf { userAgent.contains("Safari/") && userAgent.contains("Version/") }
            ?: UNKNOWN_BROWSER

        val operatingSystem = operatingSystems.firstOrNull { (marker, _) -> userAgent.contains(marker) }?.second

        return listOfNotNull(browser, operatingSystem).joinToString(" · ").take(MAX_LENGTH)
    }
}
