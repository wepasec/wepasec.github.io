const WORKER_URL = "https://api.collapsepgh.com/";

document.getElementById("signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value;
    const msg = document.getElementById("signup-message");
    const button = e.target.querySelector("button");

    button.disabled = true;
    msg.textContent = "Submitting...";

    try {
        const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName }),
        });

        const data = await res.json();

        if (res.ok) {
        msg.textContent = data.alreadySubscribed
            ? "You're already on the list!"
            : "Thanks for subscribing!";
        e.target.reset();
        } else {
        msg.textContent =
            data.error || "Something went wrong. Please try again.";
        }
    } catch {
        msg.textContent = "Something went wrong. Please try again.";
    } finally {
        button.disabled = false;
    }
});