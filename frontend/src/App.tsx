import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";

// WARNING: This code mostly is written with help from AI! Backend part is written by human.

function App() {
	const EXECUTION_ENDPOINT = "http://localhost:3000/execute";
	const STORAGE_KEY = "deen_playground_code";
	const DEFAULT_CODE = `\
fn main() i32 {
  println!("Hello, World!");
  return 0;
}`;

	const [code, setCode] = useState(() => {
		const savedCode = localStorage.getItem(STORAGE_KEY);
		return savedCode || DEFAULT_CODE;
	});
	const [input, setInput] = useState("");
	const [output, setOutput] = useState("Press 'Run' to see output");
	const [isRunning, setIsRunning] = useState(false);

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, code);
	}, [code]);

	const handleRun = async () => {
		setIsRunning(true);
		setOutput("Executing...");

		console.log("Sending to", EXECUTION_ENDPOINT);

		try {
			const response = await fetch(EXECUTION_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ code, input }),
			});

			const result = await response.json();
			setOutput(result.output || result.error || "No output");
		} catch (error) {
			setOutput(`Error: ${error.message}`);
		} finally {
			setIsRunning(false);
		}
	};

	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "3fr 1fr",
				gridTemplateRows: "1fr",
				width: "100%",
				height: "100vh",
				gap: "10px",
				boxSizing: "border-box",
				padding: "10px",
				backgroundColor: "#1e1e1e",
			}}
		>
			{/* Code Editor */}
			<div
				style={{
					gridColumn: "1",
					gridRow: "1",
					border: "1px solid #444",
					borderRadius: "4px",
					overflow: "hidden",
				}}
			>
				<Editor
					height="100%"
					defaultLanguage="rust"
					value={code}
					onChange={(value) => setCode(value || "")}
					theme="vs-dark"
					options={{
						minimap: { enabled: false },
						scrollBeyondLastLine: false,
						fontSize: 14,
						automaticLayout: true,
					}}
				/>
			</div>

			{/* Right Panel */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gridColumn: "2",
					gridRow: "1",
					gap: "10px",
				}}
			>
				{/* Header Panel */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						padding: "10px",
						border: "1px solid #444",
						borderRadius: "4px",
						backgroundColor: "#252526",
					}}
				>
					<p style={{ margin: 0, color: "#fff" }}>Deen Playground</p>
					<button
						onClick={handleRun}
						disabled={isRunning}
						style={{
							padding: "8px 16px",
							backgroundColor: isRunning ? "#555" : "#3b74a3",
							color: "white",
							border: "none",
							borderRadius: "4px",
							cursor: "pointer",
							fontWeight: "bold",
						}}
					>
						{isRunning ? "Running..." : "Run"}
					</button>
				</div>

				{/* Output */}
				<div
					style={{
						flex: 1,
						padding: "10px",
						border: "1px solid #444",
						borderRadius: "4px",
						backgroundColor: "#1e1e1e",
						color: "#fff",
						overflow: "auto",
						fontFamily: "monospace",
						whiteSpace: "pre-wrap",
					}}
				>
					{output}
				</div>

				{/* Input */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "5px",
					}}
				>
					<label style={{ color: "#fff" }}>Input:</label>
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						style={{
							minHeight: "80px",
							padding: "8px",
							borderRadius: "4px",
							border: "1px solid #444",
							backgroundColor: "#252526",
							color: "#fff",
							resize: "vertical",
						}}
					/>
				</div>
			</div>
		</div>
	);
}

export default App;
