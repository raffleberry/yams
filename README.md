# YAMS

Yet Another Music Server

## Screenshots
![](docs/1.png)
![](docs/2.png)
![](docs/3.png)
![](docs/4.png)

## Development

```sh
./bake dev # DEV=1 go run .
./bake test # go test ./...
```

Config lives in `~/.yams/config.json`:

```json
{
    "MusicDir": "/home/user/Music",
    "Ip": "127.0.0.1",
    "Port": 5550
}
```

## Build/Install

```sh
git clone https://github.com/raffleberry/yams.git
./bake build # go build -o yams .
./bake install # go install .
```

Serve behind a sub-path with `-prefix`:

```sh
yams -prefix=/yams
```
