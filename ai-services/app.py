# Import necessary libraries
from flask import Flask, request, jsonify
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
import numpy as np

# Initialize the Flask application
app = Flask(__name__)

# ==========================================
# 1. DUMMY TRAINING DATA (Proof of Concept)        
# ==========================================

# Features (Inputs): [Avg_Sleep (hrs), Avg_Water (ml), Avg_Calories, Avg_Carbs (g), Current_Weight (kg)]
X_train = np.array([
    [8.0, 2500, 2000, 150, 75.0],  # Patient 1: Healthy lifestyle, balanced diet
    [4.5, 1000, 3500, 350, 85.0],  # Patient 2: Unhealthy, low sleep, high calories & carbs
    [7.5, 3000, 1800, 120, 65.0],  # Patient 3: Healthy, strict caloric deficit for weight loss
    [5.0, 800,  2800, 280, 90.0],  # Patient 4: Unhealthy, dehydrated, high carbs
    [6.5, 2000, 2400, 200, 70.0]   # Patient 5: Moderate lifestyle
])

# Target A: Expected Weight after 30 Days (Continuous Numbers for Regressor)
# Logic: Caloric deficit leads to weight loss, surplus leads to weight gain.
y_weight_train = np.array([74.5, 87.5, 63.2, 91.8, 70.0])

# Target B: Expected Energy & Mood State (0 = Active & Fit, 1 = Lethargic/Alas)
# Logic: High carbs + low water + low sleep = Lethargic (1)
y_energy_train = np.array([0, 1, 0, 1, 0])


# ==========================================
# 2. MODEL TRAINING (Dual Architecture)
# ==========================================

# Model A (Regressor): Predicts the exact weight after 30 days
weight_model = RandomForestRegressor(random_state=42)
weight_model.fit(X_train, y_weight_train)

# Model B (Classifier): Predicts the body energy state (Fit vs Lethargic)
energy_model = RandomForestClassifier(random_state=42)
energy_model.fit(X_train, y_energy_train)


# ==========================================
# 3. PREDICTION API ENDPOINT
# ==========================================

# Endpoint to receive 7-day average data from Node.js backend
@app.route('/api/predict-dual-health', methods=['POST'])
def predict_health():
    try:
        # Extract the JSON payload sent from the frontend / Node.js
        data = request.get_json()

        # Convert raw JSON data into a structured Pandas DataFrame
        df = pd.DataFrame([data])

        # Extract features (Ensure keys match the Node.js payload exactly)
        sleep = df['avgSleep'][0]
        water = df['avgWater'][0]
        calories = df['avgCalories'][0]
        carbs = df['avgCarbs'][0]
        current_weight = df['currentWeight'][0]

        # Format the input data for the AI models
        input_data = [[sleep, water, calories, carbs, current_weight]]
        
        # 1. Predict Future Weight (Model A)
        # We use round() to keep it to 1 decimal place (e.g., 72.4 kg)
        predicted_weight = round(weight_model.predict(input_data)[0], 1)
        
        # 2. Predict Energy Level (Model B)
        energy_prediction = energy_model.predict(input_data)[0]
        energy_status = "Lethargic & Bloated" if energy_prediction == 1 else "Active & Fit (High Energy)"

        # Calculate difference to show if they will lose or gain
        weight_diff = round(predicted_weight - current_weight, 1)  
        trend = "Gain" if weight_diff > 0 else "Loss" if weight_diff < 0 else "Maintain"

        # Return the final comprehensive analysis to Node.js
        return jsonify({
            "success": True,
            "analysis": {
                "currentWeight": current_weight,
                "projectedWeight30Days": predicted_weight,
                "weightTrend": f"{trend} of {abs(weight_diff)} Kg",
                "expectedBodyState": energy_status
            },
            "message": "AI successfully processed Dual-Model predictions."
        })

    except Exception as e:
        # Catch and return any errors to prevent server crash
        return jsonify({"success": False, "error": str(e)})


# Start the Flask server on port 5000
if __name__ == '__main__':
    app.run(port=5000, debug=True)