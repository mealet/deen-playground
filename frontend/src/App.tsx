import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";

// WARNING: This code mostly is written with help from AI! Backend part is written by human.

function App() {
	const API_BASE_URL =
		process.env.NODE_ENV === "production" ? "/api" : "http://localhost:3000";

	const WS_BASE_URL =
		process.env.NODE_ENV === "production"
			? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/ws`
			: "ws://localhost:3000/ws";

	const EXECUTION_ENDPOINT = `${API_BASE_URL}/execute`;
	const KILL_ENDPOINT = `${API_BASE_URL}/kill`;

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

	const [session, setSession] = useState("");

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

	const handleStop = async () => {
		const response = await fetch(`${KILL_ENDPOINT}/${session}`, {
			method: "POST",
		});
	};

	const handleRun = async () => {
		if (isRunning) {
			return;
		}

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
			const data = await response.json();

			if (!data.success) {
				setOutput(`Error: ${data.session_id}`);
				return;
			}

			console.log(`Execution started, session ID: \`${data.session_id}\``);
			setSession(data.session_id);

			const ws = new WebSocket(`${WS_BASE_URL}/${data.session_id}`);

			ws.onopen = function () {
				setOutput("");
				console.log(`WebSocket \`${data.session_id}\` opened`);
			};

			ws.onmessage = function (event) {
				setOutput((prevOutput) => prevOutput + event.data + "\n");
				console.log(event.data);
			};

			ws.onclose = function () {
				console.log(`WebSocket \`${data.session_id}\` closed`);
				setIsRunning(false);
			};

			ws.onerror = function (error) {
				console.error(`WebSocket error: ${error}`);
			};
		} catch (error) {
			setOutput(`Error: ${error.message}`);
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

	const stopButtonStyle = {
		padding: isMobile ? "6px 12px" : "8px 16px",
		backgroundColor: !isRunning ? "#555" : "#3b74a3",
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
			{/* Header Panel - Mobile Only */}
			{isMobile && (
				<div style={headerStyle}>
					<p style={headerTextStyle}>Deen Language Playground</p>
					<div
						style={{
							display: "flex",
							gap: "8px",
						}}
					>
						<button
							onClick={handleStop}
							style={stopButtonStyle}
							disabled={!isRunning}
						>
							Stop
						</button>
						<button
							onClick={handleRun}
							disabled={isRunning}
							style={runButtonStyle}
						>
							{isRunning ? "Running..." : "Run"}
						</button>
					</div>
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
				{/* Header Panel - PC Only */}
				{!isMobile && (
					<div style={headerStyle}>
						<p style={headerTextStyle}>Deen Language Playground</p>

						<div
							style={{
								display: "flex",
								gap: "10px",
							}}
						>
							<button
								onClick={handleStop}
								style={stopButtonStyle}
								disabled={!isRunning}
							>
								Stop
							</button>
							<button
								onClick={handleRun}
								disabled={isRunning}
								style={runButtonStyle}
							>
								{isRunning ? "Running..." : "Run"}
							</button>
						</div>
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
