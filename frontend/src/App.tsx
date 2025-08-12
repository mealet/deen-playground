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
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, code);
	}, [code]);

	useEffect(() => {
		const checkScreenSize = () => {
			setIsMobile(window.innerWidth <= 768);
		};

		checkScreenSize();
		window.addEventListener("resize", checkScreenSize);

		return () => window.removeEventListener("resize", checkScreenSize);
	}, []);

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

	const containerStyle = {
		display: "grid",
		gridTemplateColumns: isMobile ? "1fr" : "3fr 1fr",
		gridTemplateRows: isMobile ? "auto auto 1fr" : "1fr",
		width: "100%",
		height: "100vh",
		gap: isMobile ? "8px" : "10px",
		boxSizing: "border-box",
		padding: isMobile ? "8px" : "10px",
		backgroundColor: "#1e1e1e",
	};

	const editorStyle = {
		gridColumn: isMobile ? "1" : "1",
		gridRow: isMobile ? "2" : "1",
		border: "1px solid #444",
		borderRadius: "4px",
		overflow: "hidden",
		minHeight: isMobile ? "300px" : "auto",
		height: isMobile ? "40vh" : "auto",
	};

	const rightPanelStyle = {
		display: "flex",
		flexDirection: "column",
		gridColumn: isMobile ? "1" : "2",
		gridRow: isMobile ? "3" : "1",
		gap: isMobile ? "8px" : "10px",
		minHeight: isMobile ? "auto" : "0",
	};

	const headerStyle = {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		padding: isMobile ? "8px" : "10px",
		border: "1px solid #444",
		borderRadius: "4px",
		backgroundColor: "#252526",
	};

	const headerTextStyle = {
		margin: 0,
		color: "#fff",
		fontSize: isMobile ? "14px" : "16px",
		fontWeight: "bold",
	};

	const runButtonStyle = {
		padding: isMobile ? "6px 12px" : "8px 16px",
		backgroundColor: isRunning ? "#555" : "#3b74a3",
		color: "white",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontWeight: "bold",
		fontSize: isMobile ? "12px" : "14px",
		minWidth: isMobile ? "70px" : "auto",
	};

	const outputStyle = {
		flex: 1,
		padding: isMobile ? "8px" : "10px",
		border: "1px solid #444",
		borderRadius: "4px",
		backgroundColor: "#1e1e1e",
		color: "#fff",
		overflow: "auto",
		fontFamily: "monospace",
		whiteSpace: "pre-wrap",
		fontSize: isMobile ? "12px" : "14px",
		minHeight: isMobile ? "120px" : "auto",
		maxHeight: isMobile ? "150px" : "none",
	};

	const inputContainerStyle = {
		display: "flex",
		flexDirection: "column",
		gap: "5px",
	};

	const inputLabelStyle = {
		color: "#fff",
		fontSize: isMobile ? "12px" : "14px",
		margin: 0,
	};

	const textareaStyle = {
		minHeight: isMobile ? "60px" : "80px",
		padding: isMobile ? "6px" : "8px",
		borderRadius: "4px",
		border: "1px solid #444",
		backgroundColor: "#252526",
		color: "#fff",
		resize: "vertical",
		fontSize: isMobile ? "12px" : "14px",
		fontFamily: "monospace",
	};

	const editorOptions = {
		minimap: { enabled: !isMobile },
		scrollBeyondLastLine: false,
		fontSize: isMobile ? 12 : 14,
		automaticLayout: true,
		wordWrap: isMobile ? "on" : "off",
		lineNumbers: isMobile ? "off" : "on",
		folding: !isMobile,
		lineDecorationsWidth: isMobile ? 5 : 10,
		lineNumbersMinChars: isMobile ? 2 : 3,
	};

	return (
		<div style={containerStyle}>
			{/* Header Panel - только на мобильных */}
			{isMobile && (
				<div style={headerStyle}>
					<p style={headerTextStyle}>Deen Playground</p>
					<button
						onClick={handleRun}
						disabled={isRunning}
						style={runButtonStyle}
					>
						{isRunning ? "Running..." : "Run"}
					</button>
				</div>
			)}

			{/* Code Editor */}
			<div style={editorStyle}>
				<Editor
					height="100%"
					defaultLanguage="rust"
					value={code}
					onChange={(value) => setCode(value || "")}
					theme="vs-dark"
					options={editorOptions}
				/>
			</div>

			{/* Right Panel */}
			<div style={rightPanelStyle}>
				{/* Header Panel - только на ПК */}
				{!isMobile && (
					<div style={headerStyle}>
						<p style={headerTextStyle}>Deen Playground</p>
						<button
							onClick={handleRun}
							disabled={isRunning}
							style={runButtonStyle}
						>
							{isRunning ? "Running..." : "Run"}
						</button>
					</div>
				)}

				{/* Output */}
				<div style={outputStyle}>{output}</div>

				{/* Input */}
				<div style={inputContainerStyle}>
					<label style={inputLabelStyle}>Input:</label>
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						style={textareaStyle}
						placeholder={isMobile ? "Enter input..." : ""}
					/>
				</div>
			</div>
		</div>
	);
}

export default App;
