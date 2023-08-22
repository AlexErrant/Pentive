// copy/paste from https://github.com/ankitrohatgi/tarballjs

/* eslint-disable @typescript-eslint/naming-convention */

import { throwExp } from "shared"

export class TarReader {
  constructor() {
    this.fileInfo = []
  }

  fileInfo: Array<{
    name: string
    type: string
    size: number
    header_offset: number
  }> = []

  buffer: ArrayBuffer | undefined

  async readFile(file: Blob) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result == null) throwExp("unexpected null")
        if (typeof event.target.result === "string")
          throwExp("unexpected string")
        this.buffer = event.target.result
        this.fileInfo = []
        this._readFileInfo()
        resolve(this.fileInfo)
      }
      reader.readAsArrayBuffer(file)
    })
  }

  readArrayBuffer(arrayBuffer: ArrayBuffer) {
    this.buffer = arrayBuffer
    this.fileInfo = []
    this._readFileInfo()
    return this.fileInfo
  }

  _readFileInfo() {
    this.fileInfo = []
    let offset = 0
    let file_size = 0
    let file_name = ""
    let file_type = null
    while (offset < this.buffer!.byteLength - 512) {
      file_name = this._readFileName(offset) // file name
      if (file_name.length === 0) {
        break
      }
      file_type = this._readFileType(offset)
      file_size = this._readFileSize(offset)

      this.fileInfo.push({
        name: file_name,
        type: file_type,
        size: file_size,
        header_offset: offset,
      })

      offset += 512 + 512 * Math.trunc(file_size / 512)
      if (file_size % 512 !== 0) {
        offset += 512
      }
    }
  }

  getFileInfo() {
    return this.fileInfo
  }

  _readString(str_offset: number, size: number) {
    const strView = new Uint8Array(this.buffer!, str_offset, size)
    const i = strView.indexOf(0)
    const td = new TextDecoder()
    return td.decode(strView.slice(0, i))
  }

  _readFileName(header_offset: number) {
    const name = this._readString(header_offset, 100)
    return name
  }

  _readFileType(header_offset: number) {
    // offset: 156
    const typeView = new Uint8Array(this.buffer!, header_offset + 156, 1)
    const typeStr = String.fromCharCode(typeView[0])
    if (typeStr === "0") {
      return "file"
    } else if (typeStr === "5") {
      return "directory"
    } else {
      return typeStr
    }
  }

  _readFileSize(header_offset: number) {
    // offset: 124
    const szView = new Uint8Array(this.buffer!, header_offset + 124, 12)
    let szStr = ""
    for (let i = 0; i < 11; i++) {
      szStr += String.fromCharCode(szView[i])
    }
    return parseInt(szStr, 8)
  }

  _readFileBlob(file_offset: number, size: number, mimetype: string) {
    const view = new Uint8Array(this.buffer!, file_offset, size)
    const blob = new Blob([view], { type: mimetype })
    return blob
  }

  _readFileBinary(file_offset: number, size: number) {
    const view = new Uint8Array(this.buffer!, file_offset, size)
    return view
  }

  _readTextFile(file_offset: number, size: number) {
    const view = new Uint8Array(this.buffer!, file_offset, size)
    const td = new TextDecoder()
    return td.decode(view)
  }

  getTextFile(file_name: string) {
    const info = this.fileInfo.find((info) => info.name === file_name)
    if (info != null) {
      return this._readTextFile(info.header_offset + 512, info.size)
    }
  }

  getFileBlob(file_name: string, mimetype: string) {
    const info = this.fileInfo.find((info) => info.name === file_name)
    if (info != null) {
      return this._readFileBlob(info.header_offset + 512, info.size, mimetype)
    }
  }

  getFileBinary(file_name: string) {
    const info = this.fileInfo.find((info) => info.name === file_name)
    if (info != null) {
      return this._readFileBinary(info.header_offset + 512, info.size)
    }
  }
}
