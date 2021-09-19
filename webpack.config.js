const path = require('path')

module.exports = {
  mode: "production",
  entry: {
    template: './src/template.js'
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].min.js',
    library: 'Template',
    libraryExport: 'default',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
}
