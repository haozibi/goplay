import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

export function activate(context: vscode.ExtensionContext) {

	// 配置重启才会生效
	let playURL: string = vscode.workspace.getConfiguration().get("goplay.playgroundurl") as string
	let withOutput: boolean = vscode.workspace.getConfiguration().get("goplay.withOutput") as boolean
	let withImports: boolean = vscode.workspace.getConfiguration().get("goplay.withImports") as boolean
	let withForceFmt: boolean = vscode.workspace.getConfiguration().get("goplay.withForceFmt") as boolean

	let goplay = new GoPlay(playURL, withOutput, withImports, withForceFmt)


	context.subscriptions.push(goplay)
}

class GoPlay {
	private logger: vscode.OutputChannel
	private ax: AxiosInstance

	// 配置
	// private isDebug: boolean
	// playgroud 链接(默认: https://play.golang.org)
	private playURL: string
	// 是否输出附加到代码中(默认: true)
	private withOutput: boolean
	// 是否开启 imports，只有 fmt 时有效(默认: true)
	private withImports: boolean
	// 是否在运行代码的时候强制 fmt(默认: false)
	private withForceFmt: boolean

	constructor(playURL: string = "https://play.golang.org", withOutput: boolean = true, withImports: boolean = true, withForceFmt: boolean = false) {
		// this.isDebug = false
		this.playURL = playURL
		this.withOutput = withOutput
		this.withImports = withImports
		this.withForceFmt = withForceFmt

		this.logger = vscode.window.createOutputChannel("goplay")
		this.ax = axios.create({
			baseURL: this.playURL,
			timeout: 60000,
			headers: {
				'X-VSCode-Header': 'goplay',
				'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
			}
		})

		this.ax.interceptors.response.use(
			function (response) {
				return response
			}, function (error) {
				return Promise.resolve(error)
			}
		)


		vscode.commands.registerCommand('extension.GoPlay.info', () => {
			this.info()
		})
		vscode.commands.registerCommand('extension.GoPlay.run', () => {
			this.runCode()
		})
		vscode.commands.registerCommand('extension.GoPlay.fmt', () => {
			this.fmtCode()
		})
		vscode.commands.registerCommand('extension.GoPlay.share', () => {
			this.shareCode()
		})
	}

	dispose() {
		this.logger.dispose()
	}

	private info() {
		let funcName: string = "info"
		let beginTime = +new Date();

		this.initLog(funcName)

		this.logger.appendLine("URL: " + this.playURL)
		this.logger.appendLine("Output: " + this.withOutput)
		this.logger.appendLine("Imports: " + this.withImports)
		this.logger.appendLine("ForceFmt: " + this.withForceFmt)
		this.logger.appendLine("")
		let endTime = +new Date();
		this.logger.appendLine("[GoPlay] total time: " + (endTime - beginTime) + "ms")
	}

	private shareCode() {

		let beginTime = +new Date();

		let funcName: string = "share"
		const editor = this.initLog(funcName)
		if (!editor) {
			this.logger.appendLine("[GoPlay] No Open Text Editor")
			return
		}

		let code = editor.document.getText()

		let postURL = this.playURL + "/share"

		this.ax.post(postURL, code)
			.then(res => {
				this.logger.appendLine(this.playURL + "/p/" + res.data)
				this.logger.appendLine("")

				// 如果需要附带 output
				if (this.withOutput) {
					editor.edit(builder => {
						builder.insert(new vscode.Position(editor.document.lineCount + 2, 0), "// share link: " + this.playURL + "/p/" + res.data)
					})
					this.logger.appendLine("[GoPlay] with output")
				}
			}).then(() => {
				let endTime = +new Date();
				this.logger.appendLine("[GoPlay] total time: " + (endTime - beginTime) + "ms")
			})
	}

	private runCode() {

		let beginTime = +new Date();

		let funcName: string = "run"
		const editor = this.initLog(funcName)
		if (!editor) {
			this.logger.appendLine("[GoPlay] No Open Text Editor")
			return
		}

		let code = editor.document.getText()

		let postURL = this.playURL + "/compile"

		this.ax.post(postURL, { version: 2, body: code })
			.then(res => res.data)
			.then(({ Errors, Events }) => {
				if (Errors) {
					this.logger.appendLine(Errors + '')
				} else {
					let msgBody: string = Events[0].Message
					// 如果需要附带 output
					if (this.withOutput) {

						let body = msgBody.split("\n")
						for (let i = 0; i < body.length; i++) {
							if (i == 0) {
								body[i] = "// output:\n// " + body[i]
								continue
							}
							body[i] = "// " + body[i]
						}

						let newBody = body.join("\n")
						editor.edit(builder => {
							const end = new vscode.Position(editor.document.lineCount + 1, 0)
							builder.insert(end, newBody)
						})

						editor.document.save()
						this.logger.appendLine(msgBody)
						this.logger.appendLine("[GoPlay] with output")
					} else {
						this.logger.appendLine(msgBody)
					}
				}
			}).then(() => {
				let endTime = +new Date();
				this.logger.appendLine("[GoPlay] total time: " + (endTime - beginTime) + "ms")
			})
	}

	private fmtCode() {

		let beginTime = +new Date();

		let funcName: string = "fmt"
		const editor = this.initLog(funcName)
		if (!editor) {
			this.logger.appendLine("[GoPlay] No Open Text Editor")
			return
		}

		let code = editor.document.getText()
		let postURL = this.playURL + "/fmt"

		this.ax({
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			url: postURL,
			params: { body: code, imports: true }
		}).then(res => res.data)
			.then(({ Error, Body }) => {
				if (Error) {
					this.logger.appendLine(Error + '')
				} else {
					editor.edit(builder => {

						const end = new vscode.Position(editor.document.lineCount + 1, 0)

						builder.replace(new vscode.Range(new vscode.Position(0, 0), end), Body)
					})
					editor.document.save()
				}

			}).then(() => {
				let endTime = +new Date();
				this.logger.appendLine("[GoPlay] total time: " + (endTime - beginTime) + "ms")
			})
	}

	private initLog(methodName: string) {

		if (!this.logger) {
			this.logger = vscode.window.createOutputChannel('goplay')
		}
		this.logger.show()
		this.logger.clear()

		let editor = vscode.window.activeTextEditor
		if (editor) {
			editor.document.save()
		}

		this.logger.appendLine("[GoPlay] command: " + methodName)
		return editor
	}
}