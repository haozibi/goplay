# GoPlay

![GoPlay](images/logo.png)

go-playground 助手

可以方便运行、格式化和分享 Go 代码，可以实现没有 Go 环境运行 Go 代码。

## 截图



## 安装

在商店搜索 **GoPlay**

## 使用

`cmd + shift + p` OR `command + p` 然后输入命令

- Run
    - 命令: `> GoPlay: Run Code`
- Fmt
    - 命令: `> GoPlay: Fmt Code`
- Share
    - 命令: `> GoPlay: Share Code`
- Info
    - 命令: `> GoPlay: Show Info`

## 配置项

- playURL
    - 描述: Playground URL
    - 默认: https://play.golang.org
- withOutput
    - 描述: 是否输出附加到代码中
    - 默认: true
- withImports
    - 描述: 是否开启 imports，只有 fmt 时有效
    - 默认: true
- withForceFmt
    - 描述: 是否在运行代码的时候强制 fmt
    - 默认: false

## License

This package is published under [MIT license](LICENSE).