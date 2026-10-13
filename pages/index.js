
import Head from "next/head";
import { useMemo, useState } from "react";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import styles from "./index.module.css";

const SAMPLE_DATA = [
  { Month: "Jan", Sales: 1200, Expenses: 700 },
  { Month: "Feb", Sales: 1500, Expenses: 850 },
  { Month: "Mar", Sales: 1350, Expenses: 800 },
  { Month: "Apr", Sales: 1800, Expenses: 950 },
  { Month: "May", Sales: 2100, Expenses: 1100 },
  { Month: "Jun", Sales: 1950, Expenses: 1000 },
];

export default function Home() {
  const [rows, setRows] = useState(SAMPLE_DATA);
  const [fileName, setFileName] = useState("Sample sales data");
  const [xKey, setXKey] = useState("Month");
  const [yKey, setYKey] = useState("Sales");
  const [chartType, setChartType] = useState("bar");
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const columns = useMemo(
    () => (rows.length ? Object.keys(rows[0]) : []),
    [rows]
  );

  const numericColumns = useMemo(
    () =>
      columns.filter((column) =>
        rows.some(
          (row) =>
            row[column] !== "" &&
            row[column] !== null &&
            row[column] !== undefined &&
            Number.isFinite(Number(row[column]))
        )
      ),
    [columns, rows]
  );

  const chartData = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            row[xKey] !== null &&
            row[xKey] !== undefined &&
            row[yKey] !== null &&
            row[yKey] !== "" &&
            Number.isFinite(Number(row[yKey]))
        )
        .slice(0, 500)
        .map((row) => ({
          ...row,
          [yKey]: Number(row[yKey]),
          [xKey]:
            typeof row[xKey] === "string" &&
            row[xKey].trim() !== "" &&
            Number.isFinite(Number(row[xKey]))
              ? Number(row[xKey])
              : row[xKey],
        })),
    [rows, xKey, yKey]
  );

  const uploadCSV = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setAnalysis("");

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a CSV file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The file must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (result) => {
        const cleanedRows = result.data.filter(
          (row) => Object.values(row).some((value) => value !== null && value !== "")
        );

        if (result.errors.length || !cleanedRows.length) {
          setError(
            result.errors[0]?.message ||
              "The CSV appears to be empty or invalid."
          );
          return;
        }

        const headers = Object.keys(cleanedRows[0] || {});
        if (headers.length < 2) {
          setError("Your CSV needs at least two columns.");
          return;
        }

        setRows(cleanedRows);
        setFileName(file.name);
        setXKey(headers[0]);

        const firstNumeric = headers.find((column) =>
          cleanedRows.some(
            (row) =>
              row[column] !== "" &&
              row[column] !== null &&
              Number.isFinite(Number(row[column]))
          )
        );

        if (firstNumeric) setYKey(firstNumeric);
      },
      error: () => setError("Could not read that CSV file."),
    });

    event.target.value = "";
  };

  const loadSample = () => {
    setRows(SAMPLE_DATA);
    setFileName("Sample sales data");
    setXKey("Month");
    setYKey("Sales");
    setChartType("bar");
    setError("");
    setAnalysis("");
  };

  const analyzeData = async () => {
    setAnalyzing(true);
    setAnalysis("");
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          columns,
          rowCount: rows.length,
          sampleRows: rows.slice(0, 20),
          xKey,
          yKey,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Analysis failed.");
      }

      setAnalysis(result.analysis);
    } catch (err) {
      setError(err.message || "Could not analyze the data.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className={styles.page}>
      <Head>
        <title>DataLens | Data Visualization</title>
        <meta
          name="description"
          content="Upload CSV data, build interactive charts, and explore trends with AI."
        />
      </Head>

      <header className={styles.header}>
        <a className={styles.brand} href="#">
          <span className={styles.logo}>D</span>
          DataLens
        </a>
        <span className={styles.headerNote}>Explore your data</span>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>YOUR DATA, MADE CLEAR</p>
          <h1>Turn rows into insights.</h1>
          <p>
            Upload a CSV, choose your columns, and explore your data through
            interactive charts and AI-powered analysis.
          </p>
        </section>

        <section className={styles.uploadCard}>
          <div>
            <h2>Upload your dataset</h2>
            <p>CSV files up to 5 MB. Your data is processed in your browser.</p>
          </div>

          <label className={styles.uploadButton}>
            <span aria-hidden="true">↑</span> Choose CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={uploadCSV}
            />
          </label>

          <button className={styles.secondaryButton} onClick={loadSample}>
            Load sample
          </button>

          <div className={styles.fileName}>
            <span className={styles.dot} />
            {fileName}
          </div>
        </section>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <section className={styles.stats}>
          <div className={styles.statCard}>
            <span>Rows</span>
            <strong>{rows.length.toLocaleString()}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Columns</span>
            <strong>{columns.length}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Numeric columns</span>
            <strong>{numericColumns.length}</strong>
          </div>
        </section>

        <section className={styles.chartCard}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>VISUAL EXPLORER</p>
              <h2>Build your chart</h2>
            </div>
            <span className={styles.badge}>Interactive</span>
          </div>

          <div className={styles.controls}>
            <label>
              Chart type
              <select
                value={chartType}
                onChange={(event) => setChartType(event.target.value)}
              >
                <option value="bar">Bar chart</option>
                <option value="line">Line chart</option>
                <option value="scatter">Scatter plot</option>
              </select>
            </label>

            <label>
              Horizontal axis
              <select
                value={xKey}
                onChange={(event) => setXKey(event.target.value)}
              >
                {columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Vertical axis
              <select
                value={yKey}
                onChange={(event) => setYKey(event.target.value)}
              >
                {numericColumns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {chartData.length > 0 ? (
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "line" ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={xKey} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey={yKey}
                      stroke="#16866a"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                ) : chartType === "scatter" ? (
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey={xKey}
                      name={xKey}
                      allowDuplicatedCategory={false}
                    />
                    <YAxis type="number" dataKey={yKey} name={yKey} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Legend />
                    <Scatter
                      name={yKey}
                      data={chartData.filter((row) =>
                        Number.isFinite(Number(row[xKey]))
                      )}
                      fill="#16866a"
                    />
                  </ScatterChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={xKey} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey={yKey}
                      fill="#16866a"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <p className={styles.empty}>
              Choose a numeric column for the vertical axis to display a chart.
            </p>
          )}

          <p className={styles.chartNote}>
            Showing up to 500 rows in the chart. The data preview below shows
            the first 10 rows.
          </p>
        </section>

        <section className={styles.tableCard}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>DATASET</p>
              <h2>Data preview</h2>
            </div>
            <span className={styles.badge}>{fileName}</span>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, index) => (
                  <tr key={index}>
                    {columns.map((column) => (
                      <td key={column}>
                        {row[column] === null || row[column] === undefined
                          ? "—"
                          : String(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.aiCard}>
          <div className={styles.aiIcon}>✳</div>
          <div className={styles.aiContent}>
            <p className={styles.eyebrow}>AI DATA ASSISTANT</p>
            <h2>What does your data tell you?</h2>
            <p>
              Ask the AI to summarize the dataset and explain possible patterns
              in the sample rows.
            </p>
            <button
              className={styles.primaryButton}
              onClick={analyzeData}
              disabled={analyzing || !rows.length}
            >
              {analyzing ? "Analyzing…" : "Analyze my data"}
            </button>

            {analysis && (
              <div className={styles.analysis} aria-live="polite">
                {analysis}
              </div>
            )}
          </div>
        </section>

        <footer className={styles.footer}>
          DataLens · Built by Angel Bello
        </footer>
      </main>
    </div>
  );
}
