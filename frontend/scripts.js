document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-view").addEventListener("click", viewCars);
    document.getElementById("btn-add").addEventListener("click", addCarForm);
    document.getElementById("btn-update").addEventListener("click", updateCarForm);
    document.getElementById("btn-delete").addEventListener("click", deleteCar);
    document.getElementById("btn-filter").addEventListener("click", filterCars);
});

// Display all cars in a table within the content area
function viewCars() {
    fetch('https://pendingapigwdomain.com/cars/viewall')
        .then(response => response.json())
        .then(data => {
            console.log(data);
            document.getElementById("content-area").innerText = JSON.stringify(data, null, 2);
        })
        .catch(error => console.error("Error fetching cars:", error));
}

// Display banner with success/error after user submits data
function showFormBanner(message, type, autoHide = true) {
    const banner = document.getElementById("form-banner");

    banner.textContent = message;
    banner.className = `${type} visible`; // e.g. "success visible"

    if (autoHide) {
        setTimeout(() => {
            banner.classList.remove("visible");

            // Optional: after fading, clear text and remove type class
            setTimeout(() => {
                banner.textContent = "";
                banner.className = "";
            }, 300); // wait for fade out transition
        }, 3000); // 3 seconds visible
    }
}

// Create form HTML for adding Cars
function addCarForm() {
    const overlay = document.getElementById("form-overlay");

    overlay.innerHTML = `
        <form id="add-car-form">
            <h2>Add a new Car</h2>
            <label for="make">Make:</label><br>
            <input type="text" id="make" name="make" required><br><br>

            <label for="model">Model:</label><br>
            <input type="text" id="model" name="model" required><br><br>

            <label for="year">Year:</label><br>
            <input type="number" id="year" name="year" required><br><br>

            <label for="year">Colour:</label><br>
            <input type="text" id="colour" name="colour" required><br><br>

            <label for="year">Milage (km):</label><br>
            <input type="number" id="mileage" name="milage" required><br><br>

            <label for="year">Registration Plate:</label><br>
            <input type="text" id="plate" name="plate" required><br><br>

            <button type="submit">Submit</button>
            <button type="button" id="cancel-btn">Cancel</button>
        </form>
    `;

    overlay.classList.remove("hidden");

    // Form event listeners
    document.getElementById("add-car-form").addEventListener("submit", addCarSubmit);
    document.getElementById("cancel-btn").addEventListener("click", () => {
        overlay.classList.add("hidden");
        overlay.innerHTML = ""; // clean up
    });
}

// handle addCarForm and send data to API
function addCarSubmit(event) {
    event.preventDefault();

    const make = document.getElementById("make").value;
    const model = document.getElementById("model").value;
    const year = document.getElementById("year").value;
    const colour = document.getElementById("colour").value;
    const mileage = document.getElementById("mileage").value;
    const plate = document.getElementById("plate").value;

    const carData = { make, model, year, colour, mileage, plate };

    fetch('https://pendingapigwdomain.com/car/add', {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key' : '<api-key-here>',
            'Referer': window.location.origin
        },
        body: JSON.stringify(carData)
    })
    .then(async (response) => {
        const data = await response.json();

        if (response.ok) {
            // ✅ Success
            showFormBanner("Car added successfully!", "success");
            setTimeout(() => {
                document.getElementById("form-overlay").classList.add("hidden");
                document.getElementById("form-overlay").innerHTML = "";
            }, 1500);
        } else {
            // ❌ Server responded with error (e.g. 400, 500)
            showFormBanner(data.message || "Failed to add car. Please try again.", "error");
        }
    })
    .catch(error => {
        // ❌ Network or unexpected error
        console.error("Error adding car:", error);
        showFormBanner("Network error. Please check your connection and try again.", "error");
    });
}

// Create form HTML for updating Cars
function updateCarForm() {
    const overlay = document.getElementById("form-overlay");

    overlay.innerHTML = `
        <form id="update-car-form">
            <h2>Update Car details</h2>

            <label for="year">Registration Plate (required):</label><br>
            <input type="text" id="plate" name="plate" required><br><br>

            <label for="make">Make:</label><br>
            <input type="text" id="make" name="make"><br><br>

            <label for="model">Model:</label><br>
            <input type="text" id="model" name="model"><br><br>

            <label for="year">Year:</label><br>
            <input type="number" id="year" name="year"><br><br>

            <label for="year">Colour:</label><br>
            <input type="text" id="colour" name="colour"><br><br>

            <label for="year">Milage (km):</label><br>
            <input type="number" id="mileage" name="milage"><br><br>

            <button type="submit">Submit</button>
            <button type="button" id="cancel-btn">Cancel</button>
        </form>
    `;

    overlay.classList.remove("hidden");

    // Form event listeners
    document.getElementById("update-car-form").addEventListener("submit", updateCarSubmit);
    document.getElementById("cancel-btn").addEventListener("click", () => {
        overlay.classList.add("hidden");
        overlay.innerHTML = ""; // clean up
    });
}

// handle updateCarForm and send data to API
function updateCarSubmit(event) {
    event.preventDefault();

    const make = document.getElementById("make").value;
    const model = document.getElementById("model").value;
    const year = document.getElementById("year").value;
    const colour = document.getElementById("colour").value;
    const mileage = document.getElementById("mileage").value;
    const plate = document.getElementById("plate").value;

    const carData = { make, model, year, colour, mileage, plate };

    fetch('https://pendingapigwdomain.com/car/update', {
        method: 'PATCH',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key' : '<api-key-here>',
            'Referer': window.location.origin
        },
        body: JSON.stringify(carData)
    })
    .then(async (response) => {
        const data = await response.json();

        if (response.ok) {
            // ✅ Success
            showFormBanner("Car details updated successfully!", "success");
            setTimeout(() => {
                document.getElementById("form-overlay").classList.add("hidden");
                document.getElementById("form-overlay").innerHTML = "";
            }, 1500);
        } else {
            // ❌ Server responded with error (e.g. 400, 500)
            showFormBanner(data.message || "Failed to update car. Please try again.", "error");
        }
    })
    .catch(error => {
        // ❌ Network or unexpected error
        console.error("Error updating car:", error);
        showFormBanner("Network error. Please check your connection and try again.", "error");
    });
}
