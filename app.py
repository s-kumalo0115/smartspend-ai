from flask import Flask, render_template, request
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/profile")
def profile():
    return render_template("profile.html")


@app.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("file")
    if not file:
        return "No file uploaded", 400

    # ---- Read CSV safely ----
    df = pd.read_csv(file)

    # ---- Normalize column names ----
    df.columns = [c.lower().strip() for c in df.columns]

    # ---- Detect DATE column ----
    date_col = next(
        (c for c in df.columns if "date" in c or "time" in c),
        None
    )

    # ---- Detect AMOUNT column ----
    amount_col = next(
        (c for c in df.columns if "amount" in c or "price" in c or "cost" in c or "value" in c),
        None
    )

    # ---- Detect CATEGORY column (optional) ----
    category_col = next(
        (c for c in df.columns if "category" in c or "type" in c or "group" in c),
        None
    )

    if not date_col or not amount_col:
        return "CSV must contain a date and numeric amount column, go to repository and download the files in the data folder to have an idea of how the csv dat/information needs to be structured, you can aslo upload these demo files on the web page", 400

    # ---- Clean & prepare ----
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df[amount_col] = pd.to_numeric(df[amount_col], errors="coerce")

    df = df.dropna(subset=[date_col, amount_col])
    df = df.sort_values(date_col)

    # ---- Create safe category ----
    if not category_col:
        df["category"] = "General"
        category_col = "category"

    # ---- KPIs ----
    total = round(df[amount_col].sum(), 2)
    average = round(df[amount_col].mean(), 2)

    # ---- Monthly aggregation ----
    df["month"] = df[date_col].dt.strftime("%b")
    monthly = df.groupby("month")[amount_col].sum()
    months = monthly.index.tolist()
    monthly_values = monthly.values.tolist()

    # ---- Forecast ----
    prediction = 0
    if len(monthly_values) > 1:
        model = LinearRegression()
        X = np.arange(len(monthly_values)).reshape(-1, 1)
        model.fit(X, monthly_values)
        prediction = round(model.predict([[len(monthly_values)]])[0], 2)

    # ---- Category aggregation ----
    category_totals = df.groupby(category_col)[amount_col].sum()

    # ---- Cumulative ----
    df["cumulative"] = df[amount_col].cumsum()

    # ---- Rolling average ----
    df["rolling_avg"] = df[amount_col].rolling(window=3).mean()

    # ---- Velocity ----
    df["velocity"] = df[amount_col].diff()

    # ---- Volatility ----
    volatility = df.groupby(category_col)[amount_col].std().fillna(0)

    # ---- Fixed vs Variable ----
    fixed_keywords = ["rent", "utility", "subscription", "insurance"]
    df["expense_type"] = df[category_col].apply(
        lambda x: "Fixed" if any(k in str(x).lower() for k in fixed_keywords) else "Variable"
    )
    expense_split = df.groupby("expense_type")[amount_col].sum()

    # ---- Anomaly detection ----
    threshold = df[amount_col].mean() + 2 * df[amount_col].std()
    anomalies = int((df[amount_col] > threshold).sum())

    return render_template(
        "dashboard.html",
        total=total,
        average=average,
        prediction=prediction,
        anomalies=anomalies,

        months=months,
        monthly=monthly_values,

        categories=category_totals.index.tolist(),
        category_totals=category_totals.values.tolist(),

        dates=df[date_col].dt.strftime("%Y-%m-%d").tolist(),
        cumulative=df["cumulative"].tolist(),
        rolling=df["rolling_avg"].fillna(0).tolist(),
        velocity=df["velocity"].fillna(0).tolist(),

        volatility_labels=volatility.index.tolist(),
        volatility_values=volatility.values.tolist(),

        expense_labels=expense_split.index.tolist(),
        expense_values=expense_split.values.tolist(),

        amounts=df[amount_col].tolist()
    )


if __name__ == "__main__":
    app.run(debug=True)
