const api_gw_url = 'https://rbpp66gbnf.execute-api.eu-west-2.amazonaws.com';

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-view").addEventListener("click", loadCars);
    document.getElementById("btn-add").addEventListener("click", addCarForm);
    document.getElementById("btn-update").addEventListener("click", updateCarForm);
    document.getElementById("btn-delete").addEventListener("click", deleteCarForm);
    document.getElementById("btn-filter").addEventListener("click", filterCarsForm);
});

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
    // send request to backend
    try {
        const response = await fetch(`${api_gw_url}/cars/view_all`);
        // Handle non-200 responses
        if (!response.ok) {
            const errorText = await response.text();
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
// Create form HTML for adding Cars
function addCarForm() {
    const overlay = document.getElementById("form-overlay");
    overlay.innerHTML = `
        <form id="add-car-form">
            <h2>Add a new Car</h2><br>

            <label for="plate">Registration Plate:</label><br>
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

    fetch(`${api_gw_url}/car`, {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(carData)
    })
    .then(async (response) => {
        const data = await response.text();
        if (response.ok) {
            // Success
            showFormBanner("Car added successfully!", "success");
            setTimeout(() => {
                document.getElementById("form-overlay").classList.add("hidden");
                document.getElementById("form-overlay").innerHTML = "";
            }, 1500);
        } else {
            // Server responded with error (e.g. 400, 500)
            showFormBanner(data || "Failed to add car. Please try again.", "error");
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
            <h2>Update Car details</h2><br>

            <label for="plate">Registration Plate (required):</label><br>
            <input type="text" id="plate" name="plate" required><br><br>

            <label for="colour">Colour:</label><br>
            <input type="text" id="colour" name="colour"><br><br>

            <label for="mileage">Mileage (km):</label><br>
            <input type="number" id="mileage" name="mileage"><br><br>

            <label for="status">Status:</label><br>
            <select name="options" id="status">
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
    document.getElementById("update-car-form").addEventListener("submit", updateCarSubmit);
    document.getElementById("cancel-btn").addEventListener("click", () => {
        overlay.classList.add("hidden");
        overlay.innerHTML = ""; // clean up
    });
}
// handle updateCarForm and send data to API
function updateCarSubmit(event) {
    event.preventDefault();
    // extract info to be modified
    const plate = encodeURIComponent(document.getElementById("plate").value);
    const colour = document.getElementById("colour").value.toUpperCase();
    const mileage = document.getElementById("mileage").value;
    const status = document.getElementById("status").value;
    // prepare car data to be updated for body
    const carData = {
        ...(colour && { colour }),
        ...(mileage && { mileage }),
        ...(status && { status }),
    };
    // check that at least one of the values is filled
    if (Object.keys(carData).length == 0) {
        showFormBanner("At least one of colour, mileage, status should be filled", "error");
        return;
    }
    // proceed with PATCH request
    fetch(`${api_gw_url}/car/${plate}`, {
        method: 'PATCH',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(carData)
    })
    .then(async (response) => {
        const data = await response.text();
        if (response.ok) {
            // Success
            showFormBanner(data, "success");
            setTimeout(() => {
                document.getElementById("form-overlay").classList.add("hidden");
                document.getElementById("form-overlay").innerHTML = "";
            }, 1500);
        } else {
            // Server responded with error (e.g. 400, 500)
            showFormBanner(data || "Failed to update car. Please try again.", "error");
        }
    })
    .catch(error => {
        // Network or unexpected error
        console.error("Error updating car:", error);
        showFormBanner("Network error. Please check your connection and try again.", "error");
    });
}
// Create form HTML for deleting Cars
function deleteCarForm() {
    const overlay = document.getElementById("form-overlay");
    overlay.innerHTML = `
        <form id="delete-car-form">
            <h2>Delete a car</h2><br>

            <label for="plate">Registration Plate:</label><br>
            <input type="text" id="plate" name="plate" required pattern="[A-Z0-9 ]{4,8}" title="Uppercase letters, numbers, spaces, max length 8"><br><br>

            <button type="submit">Submit</button>
            <button type="button" id="cancel-btn">Cancel</button>
        </form>
    `;

    overlay.classList.remove("hidden");
    // Form event listeners
    document.getElementById("delete-car-form").addEventListener("submit", deleteCarSubmit);
    document.getElementById("cancel-btn").addEventListener("click", () => {
        overlay.classList.add("hidden");
        overlay.innerHTML = ""; // clean up
    });
}
// handle deleteCarForm and send data to API
function deleteCarSubmit(event) {
    event.preventDefault();
    // extract plate from the form and make it URI compliant
    const plate = encodeURIComponent(document.getElementById("plate").value);
    fetch(`${api_gw_url}/car/${plate}`, {
        method: 'DELETE',
        mode: 'cors'
    })
    .then(async (response) => {
        const data = await response.text();

        if (response.ok) {
            // Success
            showFormBanner(data, "success");
            setTimeout(() => {
                document.getElementById("form-overlay").classList.add("hidden");
                document.getElementById("form-overlay").innerHTML = "";
            }, 1500);
        } else {
            // Server responded with error (e.g. 400, 500)
            showFormBanner(data || "Failed to delete car. Please try again.", "error");
        }
    })
    .catch(error => {
        // Network or unexpected error
        console.error("Error deleting car:", error);
        showFormBanner("Server not reachable. Please check your connection and try again", "error");
    });
}
// Create form HTML for filtering cars
function filterCarsForm() {
    const overlay = document.getElementById("form-overlay");
    overlay.innerHTML = `
        <form id="filters-cars-form">
            <h2>Filter Cars By</h2><br>

            <label for="plate">Registration Plate:</label><br>
            <input type="text" id="plate" name="plate" pattern="[A-Z0-9 ]{4,8}" title="Uppercase letters, numbers, spaces, max length 8"><br><br>

            <label for="make">Make:</label><br>
            <input type="text" id="make" name="make"><br><br>

            <label for="model">Model:</label><br>
            <input type="text" id="model" name="model"><br><br>

            <label for="year">Year:</label><br>
            <input type="number" id="year" name="year" min="1930" max="2025"><br><br>

            <label for="colour">Colour:</label><br>
            <input type="text" id="colour" name="colour"><br><br>

            <label for="mileage">Mileage (km):</label><br>
            <input type="number" id="mileage" name="mileage" min="0"><br><br>

            <label for="status">Status:</label><br>
            <select name="options" id="status">
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
    document.getElementById("filters-cars-form").addEventListener("submit", filterCarsSubmit);
    document.getElementById("cancel-btn").addEventListener("click", () => {
        overlay.classList.add("hidden");
        overlay.innerHTML = ""; // clean up
    });
}
// Retrieve cars based on filter
async function filterCarsSubmit(event) {
    event.preventDefault();
    // extract info from the form
    const plate = encodeURIComponent(document.getElementById("plate").value);
    const make = encodeURIComponent(document.getElementById("make").value.toUpperCase());
    const model = encodeURIComponent(document.getElementById("model").value.toUpperCase());
    const year = document.getElementById("year").value;
    const colour = document.getElementById("colour").value.toUpperCase();
    const mileage = document.getElementById("mileage").value;
    const status = document.getElementById("status").value;
    // prepare car data to be used as filter
    const carFilter = {
        ...(plate && { plate }),
        ...(make && { make }),
        ...(model && { model }),
        ...(year && { year }),
        ...(colour && { colour }),
        ...(mileage && { mileage }),
        ...(status && { status }),
    };
    // check that at least one of the values is filled
    if (Object.keys(carFilter).length == 0) {
        showFormBanner("At least one value is required to filter", "error");
        return;
    }
    // Close form
    document.getElementById("form-overlay").classList.add("hidden");
    document.getElementById("form-overlay").innerHTML = "";
    // prepare content area for user
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = 'Loading...';
    // build query string
    const queryString = new URLSearchParams(carFilter).toString();
    // send request to backend
    try {
        const response = await fetch(`${api_gw_url}/cars?${queryString}`);
        // Handle non-200 responses
        if (!response.ok) {
            const errorText = await response.text();
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