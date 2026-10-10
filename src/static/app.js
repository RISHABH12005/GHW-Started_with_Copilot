document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Fetch and render the current activity list from the API.
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error("The activities could not be loaded.");
      }
      const activities = await response.json();

      activitiesList.replaceChildren();
      // Clear old options so refreshing after a signup won't duplicate them.
      activitySelect.replaceChildren(new Option("-- Select an activity --", ""));

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("article");
        activityCard.className = "activity-card";

        const heading = document.createElement("h4");
        heading.textContent = name;
        activityCard.appendChild(heading);

        const description = document.createElement("p");
        description.textContent = details.description;
        activityCard.appendChild(description);

        const schedule = document.createElement("p");
        schedule.innerHTML = "<strong>Schedule:</strong> ";
        schedule.append(document.createTextNode(details.schedule));
        activityCard.appendChild(schedule);

        const spotsLeft = details.max_participants - details.participants.length;
        const availability = document.createElement("p");
        availability.innerHTML = "<strong>Availability:</strong> ";
        availability.append(document.createTextNode(`${spotsLeft} spots left`));
        activityCard.appendChild(availability);

        const participantsSection = document.createElement("section");
        participantsSection.className = "participants-section";
        const participantsHeading = document.createElement("h5");
        participantsHeading.textContent = `Participants (${details.participants.length})`;
        participantsSection.appendChild(participantsHeading);

        if (details.participants.length === 0) {
          const emptyMessage = document.createElement("p");
          emptyMessage.className = "no-participants";
          emptyMessage.textContent = "No students signed up yet.";
          participantsSection.appendChild(emptyMessage);
        } else {
          const participantsList = document.createElement("ul");
          participantsList.className = "participants-list";

          details.participants.forEach((email) => {
            const item = document.createElement("li");
            item.className = "participant-item";

            const emailSpan = document.createElement("span");
            emailSpan.className = "participant-email";
            emailSpan.textContent = email;
            item.appendChild(emailSpan);

            const unregisterButton = document.createElement("button");
            unregisterButton.type = "button";
            unregisterButton.className = "unregister-button";
            unregisterButton.textContent = "✕";
            unregisterButton.setAttribute("aria-label", `Unregister ${email} from ${name}`);
            unregisterButton.title = `Unregister ${email}`;
            unregisterButton.dataset.unregister = "true";
            unregisterButton.dataset.activity = name;
            unregisterButton.dataset.email = email;
            item.appendChild(unregisterButton);

            participantsList.appendChild(item);
          });
          participantsSection.appendChild(participantsList);
        }

        activityCard.appendChild(participantsSection);
        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    window.setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  // Event delegation handles unregister buttons created during each render.
  activitiesList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-unregister]");
    if (!button) return;

    button.disabled = true;
    const activity = button.dataset.activity;
    const email = button.dataset.email;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Could not unregister this student.");
      }

      await fetchActivities();
      showMessage(result.message, "success");
    } catch (error) {
      showMessage(error.message || "Failed to unregister. Please try again.", "error");
      console.error("Error unregistering student:", error);
      button.disabled = false;
    }
  });

  // Handle form submission and refresh the activity cards immediately.
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const activity = activitySelect.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );
      const result = await response.json();

      if (response.ok) {
        signupForm.reset();
        await fetchActivities();
        showMessage(result.message, "success");
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  fetchActivities();
});
