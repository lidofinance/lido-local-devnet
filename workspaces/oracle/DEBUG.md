### Debugging oracles remotely

There's a Dockerfile replacement, running oracle modules via debugpy. It listens on port 5678 inside
of a container for a client connection without interrupting code. Any time one wants to debug a
running process, they can connect to the port exposed by the container.

An example configuration for VS Code `launch.json` looks like this:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug Oracle Process",
            "type": "debugpy",
            "request": "attach",
            "connect": {
                "host": "localhost",
                "port": 5678
            },
            "pathMappings": [
                {
                    "localRoot": "${workspaceFolder}",
                    "remoteRoot": "/app"
                }
            ]
        }
    ]
}
```

All the configured breakpoints will be send upon client connection. Consider placing a breakpoint in
the `_cycle` function. Make sure you provided a correct port to connect to, see
`./docker-compose.devnet.yml` file for mapped ports.
