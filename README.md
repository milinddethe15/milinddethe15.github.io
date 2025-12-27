# Personal site

Built using Hugo, hugo-coder theme and three.js. 

### Local Setup

1. Install Packages: 
```sh
nvm use
npm i
```

2. Download theme submodule:
```sh
git submodule update --init --recursive
```

3. Run Hugo server(use this version https://github.com/gohugoio/hugo/releases/tag/v0.144.2):
```sh
hugo serve
```

4. To push `public/` to s3:
```sh
aws s3 sync public/ s3://milinddethe15-portfolio
```