const api_gw_url = '<API-GATEWAY-ENDPOINT>';

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-view").addEventListener("click", loadCars);
    document.getElementById("btn-add").addEventListener("click", addCarForm);
    document.getElementById("btn-update").addEventListener("click", updateCarForm);
    document.getElementById("btn-delete").addEventListener("click", deleteCar);
    document.getElementById("btn-filter").addEventListener("click", filterCars);
});

// Display all cars within the content area
function displayCarsTable(data) {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = '';

    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    Object.keys(data[0]).forEach(key => {
        const th = document.createElement('th');
        th.textContent = key.toUpperCase();
        th.style.border = '1px solid #ccc';
        th.style.padding = '8px';
        th.style.backgroundColor = '#f2f2f2';
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    // Table body
    const tbody = document.createElement('tbody');
    data.forEach(car => {
        const row = document.createElement('tr');
        Object.values(car).forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            td.style.border = '1px solid #ccc';
            td.style.padding = '8px';
            row.appendChild(td);
        });
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    contentArea.appendChild(table);
}
// Load all cars
async function loadCars() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = 'Loading...';

    try {
        const response = await fetch(`${api_gw_url}/cars/view_all`);
        // Handle non-200 responses
        if (!response.ok) {
            const errorText = await response.json();
            contentArea.innerHTML = `<p style="color: red;">Error ${response.status}: ${errorText}</p>`;
            return;
        }
        const cars = await response.json(); // retrieve JSON array with cars
        displayCarsTable(cars); // call function that builds the table
    } catch (err) {
        // Handle network or JS-level errors
        contentArea.innerHTML = `<p style="color: red;">An unexpected error occurred: ${err.message}</p>`;
    }
}
// Display banner with success/error after user submits data
function showFormBanner(message, type, autoHide = true) {
    const banner = document.getElementById("form-banner");
    banner.textContent = message;
    banner.className = `${type} visible`; // e.g. "success visible"

    if (autoHide) {
        setTimeout(() => {
            banner.classList.remove("visible");
            // after fading, clear text and remove type class
            setTimeout(() => {
                banner.textContent = "";
                banner.className = "";
            }, 300); // wait for fade out transition
        }, 2000); // 2 seconds visible
    }
}
// Create form HTML for adding Cars
function addCarForm() {
    const overlay = document.getElementById("form-overlay");

    overlay.innerHTML = `
        <form id="add-car-form">
            <h2>Add a new Car</h2><br>

            <label for="year">Registration Plate:</label><br>
            <input type="text" id="plate" name="plate" required pattern="[A-Z0-9 ]{4,8}" title="Uppercase letters, numbers, spaces, max length 8"><br><br>

            <label for="make">Make:</label><br>
            <input type="text" id="make" name="make" required><br><br>

            <label for="model">Model:</label><br>
            <input type="text" id="model" name="model" required><br><br>

            <label for="year">Year:</label><br>
            <input type="number" id="year" name="year" required min="1930" max="2025"><br><br>

            <label for="colour">Colour:</label><br>
            <input type="text" id="colour" name="colour" required><br><br>

            <label for="mileage">Mileage (km):</label><br>
            <input type="number" id="mileage" name="mileage" required min="0"><br><br>

            <label for="status">Status:</label><br>
            <select name="options" id="status" required>
                <option value="" disabled selected>-- Select --</option>
                <option value="TOTALLED">Totalled</option>
                <option value="NEEDS_REPAIR">Needs Repair</option>
                <option value="ACCEPTABLE">Acceptable</option>
            </select><br><br>

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

    const plate = document.getElementById("plate").value;
    const make = document.getElementById("make").value.toUpperCase();
    const model = document.getElementById("model").value.toUpperCase();
    const year = document.getElementById("year").value;
    const colour = document.getElementById("colour").value.toUpperCase();
    const mileage = document.getElementById("mileage").value;
    const status = document.getElementById("status").value;

    const carData = { plate, make, model, year, colour, mileage, status };

    fetch(`${api_gw_url}/car/add`, {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(carData)
    })
    .then(async (response) => {
        const data = await response.json();

        if (response.ok) {
            // Success
            showFormBanner("Car added successfully!", "success");
            setTimeout(() => {
                document.getElementById("form-overlay").classList.add("hidden");
                document.getElementById("form-overlay").innerHTML = "";
            }, 1500);
        } else {
            // Server responded with error (e.g. 400, 500)
            showFormBanner(data.message || "Failed to add car. Please try again.", "error");
        }
    })
    .catch(error => {
        // Network or unexpected error
        console.error("Error adding car:", error);
        showFormBanner("Server not reachable. Please check your connection and try again", "error");
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
