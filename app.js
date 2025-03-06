

const map = L.map("map").setView([34.0836, 74.7973], 5); // Centered on India
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

// Icons for Normal and Critical Soldiers
const normalIcon = L.icon({
  iconUrl: "https://cdn-icons-png.freepik.com/512/7711/7711464.png", // Green icon for normal metrics
  iconSize: [40, 40],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const criticalIcon = L.icon({
  iconUrl: "https://png.pngtree.com/png-vector/20230106/ourmid/pngtree-flat-red-location-sign-png-image_6553065.png", // Warning icon for critical metrics
  iconSize: [40, 40],
  iconAnchor: [25, 30],
  popupAnchor: [0, -30],
});

// Create a dictionary to store markers by soldier ID
const soldierMarkers = {};

// Fetch soldiers' data from API
fetch("https://nbfjl9bui6.execute-api.us-east-1.amazonaws.com/a/dev")
  .then((response) => response.json())
  .then((apiResponse) => {
    if (apiResponse.statusCode === 200) {
      const parsedBody = JSON.parse(apiResponse.body);
      const soldiersData = parsedBody.data || [];
      if (!Array.isArray(soldiersData)) {
        throw new Error("Data format is incorrect, expected an array.");
      }

      // Process data to find the most recent location for each soldier
      const latestSoldiers = getMostRecentLocation(soldiersData);
      processSoldiersData(latestSoldiers);
    } else {
      console.error("Error: Unexpected status code", apiResponse.statusCode);
    }
  })
  .catch((error) => {
    console.error("Error fetching data:", error);
  });

// Function to get the most recent record for each soldier
function getMostRecentLocation(soldiers) {
  const soldierMap = {};

  soldiers.forEach((soldier) => {
    const id = soldier.ID;
    const timestamp = new Date(soldier.Timestamp);

    if (!soldierMap[id] || timestamp > new Date(soldierMap[id].Timestamp)) {
      soldierMap[id] = soldier;
    }
  });

  return Object.values(soldierMap);
}

// Function to process and display soldiers on the map
function processSoldiersData(soldiers) {
  const alertQueue = []; // Queue to manage alerts
  let alertInProgress = false; // To track if an alert is being shown
  let criticalSoldiersCount = 0; // To count the soldiers requiring attention

  soldiers.forEach((soldier) => {
    const locationParts = soldier.Location.split(",").map((part) => parseFloat(part.trim()));

    // Parse Blood Pressure
    const [systolicBP, diastolicBP] = soldier["BloodPressure"].split("/").map((value) => parseFloat(value.trim()));

    const batteryLevel = parseFloat(soldier["BatteryLevel"]); // Corrected field name
    const oxygenLevel = parseFloat(soldier["OxygenLevel"]);

    const isCritical =
      soldier.HeartRate < 60 ||
      soldier.HeartRate > 100 ||
      parseFloat(soldier["BodyTemperature"]) < 35.1 ||
      parseFloat(soldier["BodyTemperature"]) > 38 ||
      systolicBP < 90 || // Check systolic BP
      systolicBP > 140 || // Check systolic BP
      diastolicBP < 60 || // Check diastolic BP
      diastolicBP > 90 || // Check diastolic BP
      batteryLevel < 20 || // Check Battery Level
      oxygenLevel < 90;

    const marker = L.marker(locationParts, {
      icon: isCritical ? criticalIcon : normalIcon,
    }).addTo(map);

    // Define color styling for parameters based on conditions
    const heartRateCritical = soldier.HeartRate < 60 || soldier.HeartRate > 100;
    const tempCritical =
      parseFloat(soldier["BodyTemperature"]) < 35.1 || parseFloat(soldier["BodyTemperature"]) > 38;
    const airQualityCritical = soldier["Air Quality Index"] > 34;
    const systolicBPCondition = systolicBP < 90 || systolicBP > 140;
    const diastolicBPCondition = diastolicBP < 60 || diastolicBP > 90;
    const batteryCritical = batteryLevel < 20;
    const oxygenCritical = oxygenLevel < 90;

    // Information to display in the popup
    const popupContent = `
      <b>ID:</b> ${soldier.ID}<br>
      <b>Name:</b> ${soldier.Name}<br>
      <b>Location:</b> ${soldier.Location}<br>
      <b>Timestamp:</b> ${soldier.Timestamp}<br>
      <b>Heart Rate:</b> <span style="color: ${heartRateCritical ? "red" : "black"};">
        ${soldier.HeartRate} bpm</span><br>
      <b>Body Temperature:</b> <span style="color: ${tempCritical ? "red" : "black"};">
        ${soldier["BodyTemperature"]} °C</span><br>
      <b>Systolic BP:</b> <span style="color: ${systolicBPCondition ? "red" : "black"};">
        ${systolicBP} mmHg</span><br>
      <b>Diastolic BP:</b> <span style="color: ${diastolicBPCondition ? "red" : "black"};">
        ${diastolicBP} mmHg</span><br>
      <b>Battery Level:</b> <span style="color: ${batteryCritical ? "red" : "black"};">
        ${batteryLevel}%</span><br>
      <b>Air Quality Index:</b> <span style="color: ${airQualityCritical ? "red" : "black"};">
        ${soldier["Air Quality Index"]}</span><br>
      <b>Oxygen Level:</b> <span style="color: ${oxygenCritical ? "red" : "black"};">
        ${oxygenLevel}%</span><br>
    `;

    // Bind popup on single click
    marker.bindPopup(popupContent);

    // Generate alerts for critical conditions
    if (isCritical) {
      criticalSoldiersCount++; // Increment the count of critical soldiers

      const criticalParams = [];
      const criticalValues = [];
      if (heartRateCritical) {
        criticalParams.push("Heart Rate");
        criticalValues.push(soldier.HeartRate);
      }
      if (tempCritical) {
        criticalParams.push("Hypothermia");
        criticalValues.push(soldier["BodyTemperature"]);
      }
      if (systolicBPCondition) {
        criticalParams.push("Systolic BP");
        criticalValues.push(systolicBP);
      }
      if (diastolicBPCondition) {
        criticalParams.push("Diastolic BP");
        criticalValues.push(diastolicBP);
      }
      if (batteryCritical) {
        criticalParams.push("Battery Level");
        criticalValues.push(batteryLevel);
      }
      if (airQualityCritical) {
        criticalParams.push("Air Quality Index");
        criticalValues.push(soldier["Air Quality Index"]);
      }
      if (oxygenCritical) {
        criticalParams.push("Oxygen Level");
        criticalValues.push(oxygenLevel);
      }

      // Add the alert to the queue, include name and ID
      alertQueue.push({
        soldierId: soldier.ID,
        name: soldier.Name || "Unknown", // Add soldier's name
        issues: criticalParams,
        values: criticalValues,
      });
    }
  });

  // Function to process the alert queue
  function processAlertQueue() {
    if (alertInProgress || alertQueue.length === 0) return;

    alertInProgress = true;
    const alert = alertQueue.shift();

    // Show a modal-style alert using a dynamically created element
const alertBox = document.createElement("div");
alertBox.className = "alert-popup";
alertBox.innerHTML = `
  <div class="alert-content">
    <h4>ALERT: Critical Alert for ${alert.name} (ID: ${alert.soldierId})</h4>
    <p><strong>Issues:</strong> ${alert.issues.map((param, index) => {
      // Define units for each parameter
      let unit = '';
      if (param === "Heart Rate") unit = 'bpm';
      if (param === "Hypothermia") unit = '°C';
      if (param === "Systolic BP" || param === "Diastolic BP") unit = 'mmHg';
      if (param === "Battery Level") unit = '%';
      if (param === "Air Quality Index") unit = '';
      if (param === "Oxygen Level") unit = '%';

      return `<span><b>${param}:</b> ${alert.values[index]} ${unit}</span>`;
    }).join(', ')}</p>
  </div>
`;
document.body.appendChild(alertBox);

    // Remove the alert box after 5 seconds and proceed to the next alert
    setTimeout(() => {
      document.body.removeChild(alertBox);

      // Add the alert to the "alerts" section after 2 seconds
      setTimeout(() => {
        const alertContainer = document.getElementById("alerts");
        const alertDiv = document.createElement("div");
        alertDiv.className = "alert";
        alertDiv.innerHTML = `
          <h4>Name: ${alert.name} (ID: ${alert.soldierId})</h4>
          <p>Critical health parameters detected: ${alert.issues.join(", ")}. Values: ${alert.values.join(", ")}</p>
        `;
        alertContainer.appendChild(alertDiv);
      }, 2000); // 2-second delay before adding to the alert container

      alertInProgress = false; // Reset flag
      processAlertQueue(); // Process the next alert in the queue
    }, 5000); // 5-second delay for removing the popup
  }

  // Start processing the alert queue
  processAlertQueue();

  // Count and Display Number of Soldiers
  const deployedCount = soldiers.length;
  const metricsContainer = document.getElementById("metrics-section");

  // Create a container for both deployed and attention required soldiers
  const metricsRow = document.createElement("div");
  metricsRow.className = "metrics-row";
                                    
  const deployedCard = document.createElement("div");
  deployedCard.className = "metric-card";
  deployedCard.innerHTML = `
    <h3>Total Soldiers Deployed</h3>
    <p>${deployedCount}</p>
  `;

  const attentionCard = document.createElement("div");
  attentionCard.className = "metric-card";
  attentionCard.innerHTML = `
    <h3>Soldiers Requiring Attention</h3>
    <p>${criticalSoldiersCount}</p>
  `;

  metricsRow.appendChild(deployedCard);
  metricsRow.appendChild(attentionCard);
  metricsContainer.appendChild(metricsRow);
}

// Clear All Alerts functionality
const clearAlertsButton = document.getElementById("clear-alerts-btn");
clearAlertsButton.addEventListener("click", () => {
  const alertContainer = document.getElementById("alerts");
  alertContainer.innerHTML = ""; // Clear all alerts
});


// Append the Clear button to the bottom of the alert container
const alertContainer = document.getElementById("alerts");



