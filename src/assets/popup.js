document.querySelectorAll(".event-card").forEach(card => {

    const openBtn = card.querySelector(".open-popup");
    const overlay = card.querySelector(".popup-overlay");
    const popup = card.querySelector(".popup-content");
    const closeBtn = card.querySelector(".popup-close");

    function closePopup() {
        overlay.style.display = "none";
        document.body.style.overflow = "";
    }

    openBtn.addEventListener("click", function (e) {
        e.preventDefault();
        overlay.style.display = "flex";
        document.body.style.overflow = "hidden";
    });

    closeBtn.addEventListener("click", closePopup);

    overlay.addEventListener("click", function (e) {
        if (!popup.contains(e.target)) {
            closePopup();
        }
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            closePopup();
        }
    });
});