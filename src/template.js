import { customAlphabet } from 'nanoid'

class Template {
  constructor(options = {}) {
    this._options = options
    this._template = this._fetch(options.name)
    this._data = this._scope(options)
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

  _value(key, called) {
    let value = this._data[key]
    value = typeof value == 'function' ? value.bind(this._data) : value
    return called ? value() : value
  }

  _update(key, _document = document) {
    const target = this._binds.result[key]
    if (!target) return

    Object.keys(target).forEach(nanoid => {
      const $ = _document.querySelector(`[data-${nanoid}]`)

      target[nanoid].forEach(data => {
        let value = this._value(key, data.called)
        value = data.value.replace(data.replace, value.toString())

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

  _scope(options) {
    const data = {
      ...options.data,
      ...options.methods,
      // Do
    }

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

  _parse_do(nanoid, acc, cur, type, cb) {
    const value = type == 'attr' ? cur.value : cur.nodeValue
    if (!value) return acc

    const re = /({{\s*([\w-]+)(\(\))?\s*}})/
    const match = value.match(re)
    if (!match) return acc

    const [replace, key, called] = match.slice(1)
    let data = { type, replace, value, key, called: !!called }
    data = cb ? cb(data) : data
    if (!data) return acc

    if (!acc[key]) acc[key] = {}
    if (!acc[key][nanoid]) acc[key][nanoid] = []

    acc[key][nanoid].push(data)
    return acc
  }

  _parse_listener($, name, data) {
    const match = name.match(/data-on([\w]+)(\..*)*/)
    const [type, _options] = match.slice(1)

    let options = {}
    if (_options) {
      options = _options.split('.').slice(1)
      options = options.reduce((acc, cur) => {
        return { ...acc, [cur]: true }
      }, {})
    }

    const handler = this._value(data.key, data.called)
    $.addEventListener(type, handler, options)
    $.removeAttribute(name)
  }

  _parse($, _result = {}) {
    const result =
      Array.from($.children).reduce((acc, $cur) => {
        const nanoid = this._nanoid()
        $cur.dataset[nanoid] = ''

        const parse_do = this._parse_do.bind(this, nanoid)

        acc = Array.from($cur.attributes).reduce((acc, cur) => {
          const { name } = cur
          return parse_do(acc, cur, 'attr', data => {
            if (name.slice(0, 7) != 'data-on') return { ...data, name }
            this._parse_listener($cur, name, data)
          })
        }, acc)

        acc = Array.from($cur.childNodes).reduce((acc, cur, i) => {
          if (cur.nodeType != Node.TEXT_NODE) return acc
          return parse_do(acc, cur, 'text', data => ({ ...data, i }))
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
