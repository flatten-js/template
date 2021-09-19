import { customAlphabet } from 'nanoid'

class Template {
  constructor(options = {}) {
    this._options = options
    this._template = this._fetch(options.name)
    this._data = this._proxy(options.data)
    this._binds = this._parse(this.template)

    this._init(options.mount)
  }

  get template() {
    return this._template.cloneNode(true)
  }

  _dependencies($template) {
    $template = document.importNode($template.content, true)

    const dependencies = $template.querySelectorAll('[data-dependency]')
    dependencies.forEach($ => {
      const _$template = this._fetch($.dataset.dependency)
      $.appendChild(_$template)
    })

    return $template
  }

  _fetch(name) {
    const $template = document.getElementById(name)
    return this._dependencies($template)
  }

  _update(key, _document = document) {
    const target = this._binds.result[key]
    if (!target) return

    Object.keys(target).forEach(nanoid => {
      const $ = _document.querySelector(`[data-${nanoid}]`)

      target[nanoid].forEach(data => {
        const value = data.value.replace(data.replace, this._data[key])

        switch (data.type) {
          case 'attr':
            $.setAttribute(data.name, value)
            break

          case 'text':
            $.childNodes[data.i].nodeValue = value
            break
        }
      })
    })

    return _document
  }

  _proxy(data = {}) {
    return new Proxy(data, {
      set: (target, k, v) => {
        target[k] = v
        this._update(k)
        return true
      },
      get(target, k) {
        return target[k]
      }
    })
  }

  _nanoid() {
    // Header
    const number = "0123456789"
    const header = customAlphabet(number, 2)

    // Body
    // Excluding capital letters and hyphens
    const alphabet = '0123456789_abcdefghijklmnopqrstuvwxyz'
    const body = customAlphabet(alphabet, 14)

    return `nano-${header()}${body()}`
  }

  _parse_do(nanoid, acc, cur, type, i) {
    const value = type == 'attr' ? cur.value : cur.nodeValue
    if (!value) return acc

    const match = value.match(/({{\s*([\w-]+)\s*}})/)
    if (!match) return acc

    const [replace, name] = match.slice(1)
    if (!acc[name]) acc[name] = {}
    if (!acc[name][nanoid]) acc[name][nanoid] = []

    const data = { type, replace, value }
    if (type == 'attr') data.name = cur.name
    if (type == 'text') data.i = i

    acc[name][nanoid].push(data)
    return acc
  }

  _parse($, _result = {}) {
    const result =
      Array.from($.children).reduce((acc, $cur) => {
        const nanoid = this._nanoid()
        $cur.dataset[nanoid] = ''

        const parse_do = this._parse_do.bind(this, nanoid)

        acc = Array.from($cur.attributes).reduce((acc, cur) => {
          return parse_do(acc, cur, 'attr')
        }, acc)

        acc = Array.from($cur.childNodes).reduce((acc, cur, i) => {
          if (cur.nodeType != Node.TEXT_NODE) return acc
          return parse_do(acc, cur, 'text', i)
        }, acc)

        return this._parse($cur, acc).result
      }, _result)

      return { template: $, result }
  }

  _build() {
    const { template, result } = this._binds
    Object.keys(result).forEach(name => this._update(name, template))
    return template
  }

  _init(mount) {
    const $mount = document.getElementById(mount)
    const $template = this._build()
    $mount.appendChild($template)
  }
}

export default Template
