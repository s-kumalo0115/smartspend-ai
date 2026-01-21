from flask import Flask, render_template, request
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

app = Flask(__name__)

@app.route("/profile")
def profile():
    return render_template("profile.html")

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload():
    df = pd.read_csv(request.files["file"])

    # --- Data preparation ---
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date")
    df["month"] = df["date"].dt.strftime("%b")
    df["day"] = df["date"].dt.day

    # --- KPI Metrics ---
    total = round(df["amount"].sum(), 2)
    average = round(df["amount"].mean(), 2)

    # --- Monthly totals ---
    monthly = df.groupby("month")["amount"].sum()
    months = monthly.index.tolist()
    monthly_values = monthly.values.tolist()

    # --- Linear Regression Forecast ---
    model = LinearRegression()
    X = np.arange(len(months)).reshape(-1, 1)
    y = monthly_values
    model.fit(X, y)
    prediction = round(model.predict([[len(months)]])[0], 2)

    # --- Category aggregation ---
    category_totals = df.groupby("category")["amount"].sum()
    categories = category_totals.index.tolist()
    category_values = category_totals.values.tolist()

    # --- Cumulative spending ---
    df["cumulative"] = df["amount"].cumsum()

    # --- Rolling average ---
    df["rolling_avg"] = df["amount"].rolling(window=3).mean()

    # --- Spending velocity ---
    df["velocity"] = df["amount"].diff()

    # --- Category volatility ---
    volatility = df.groupby("category")["amount"].std().fillna(0)

    # --- Fixed vs variable ---
    fixed_categories = ["Rent", "Utilities"]
    df["expense_type"] = df["category"].apply(
        lambda x: "Fixed" if x in fixed_categories else "Variable"
    )
    expense_split = df.groupby("expense_type")["amount"].sum()

    # --- Anomaly detection ---
    threshold = df["amount"].mean() + 2 * df["amount"].std()
    anomalies = len(df[df["amount"] > threshold])

    return render_template(
        "dashboard.html",
        total=total,
        average=average,
        prediction=prediction,
        anomalies=anomalies,

        months=months,
        monthly=monthly_values,

        categories=categories,
        category_totals=category_values,

        dates=df["date"].dt.strftime("%Y-%m-%d").tolist(),
        cumulative=df["cumulative"].tolist(),
        rolling=df["rolling_avg"].fillna(0).tolist(),
        velocity=df["velocity"].fillna(0).tolist(),

        volatility_labels=volatility.index.tolist(),
        volatility_values=volatility.values.tolist(),

        expense_labels=expense_split.index.tolist(),
        expense_values=expense_split.values.tolist(),

        amounts=df["amount"].tolist()
    )


if __name__ == "__main__":
    app.run(debug=True)
