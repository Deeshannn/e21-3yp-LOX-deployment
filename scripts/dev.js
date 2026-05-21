const { spawn } = require("child_process")
const path = require("path")

const rootDir = path.resolve(__dirname, "..")
const backendDir = path.join(rootDir, "backend")
const frontendDir = path.join(rootDir, "code", "lox-dashboard-suite")

const children = []

function run(name, cwd) {
  const child = spawn("npm", ["start"], {
    cwd,
    stdio: "inherit",
    shell: true,
  })

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`)
    }
  })

  children.push(child)
}

function cleanup() {
  for (const child of children) {
    if (!child.killed) {
      child.kill()
    }
  }
}

process.on("SIGINT", () => {
  cleanup()
  process.exit(0)
})

process.on("SIGTERM", () => {
  cleanup()
  process.exit(0)
})

run("backend", backendDir)
run("frontend", frontendDir)