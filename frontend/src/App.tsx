import React from "react";
import ReactDOM from "react-dom";

import Editor from "@monaco-editor/react";
import { useState } from "react";

function App() {
	const EXECUTION_ENDPOINT = "localhost:3000/execute";
	const DEFAULT_CODE = `\
fn main() i32 {

  println!("Hello, World!");

  return 0;
}
  `;

	const [input, setInput] = useState("");
	const [output, setOutput] = useState("Press `Run` to see output");

	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "4fr 1fr",
				gridTemplateRows: "auto auto",
				height: "100vh",
				gap: "10px",
				boxSizing: "border-box",
				// padding: "10px",
			}}
		>
			{/* Code Editor */}
			<div
				style={{
					gridColumn: "1",
					gridRow: "1 / span 3",
					border: "1px solid #ccc",
					borderRadius: "4px",
					overflow: "hidden",
				}}
			>
				<Editor
					width="100vh"
					height="100%"
					defaultLanguage="javascript"
					defaultValue={DEFAULT_CODE}
					theme="vs-dark"
					options={{
						minimap: { enabled: false },
						scrollBeyondLastLine: false,
						fontSize: 14,
					}}
				/>
			</div>

			{/* Output */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "auto",
					gridTemplateRows: "1fr 10fr 1fr",
					width: "100vh",
					gridColumn: "2",
					gridRow: "1 / span 3",
					border: "1px solid #ccc",
					borderRadius: "4px",
					padding: "10px",
					gap: "5px",
					backgroundColor: "#1e1e1e",
					color: "#fff",
					overflow: "auto",
				}}
			>
				{/* Panel */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						// width: "100%",
						border: "1px solid #ccc",
						borderRadius: "4px",
						padding: "5px",
					}}
				>
					<p
						style={{
							fontFamily: "sans-serif",
							fontSize: "1.3em",
							marginLeft: "10px",
						}}
					>
						Deen Playground
					</p>

					<button
						style={{
							backgroundColor: "#3b74a3",
						}}
					>
						Run
					</button>
				</div>

				{/* Output */}
				<div
					style={{
						border: "1px solid #ccc",
						borderRadius: "4px",
					}}
				>
					<pre></pre>
				</div>

				{/* Input */}
				<div
					style={{
						border: "1px solid #ccc",
						borderRadius: "4px",
					}}
				></div>
			</div>
		</div>
	);
}

export default App;
