import { feishuConfig } from '../config/feishu.js'
import { list, listRecords, text } from './feishu.js'

// 新 5 表结构用「供应商名称」作为关联键
const nameOf = (record) => text(record.fields['供应商名称'])

function parseFleetScale(str) {
  // 车队规模文本示例：车头 12 / 车架 30 / 车厢 18
  const s = String(str || '')
  const pick = (key) => {
    const m = s.match(new RegExp(`${key}\\s*(\\d+)`))
    return m ? Number(m[1]) : 0
  }
  return { trucks: pick('车头'), frames: pick('车架'), boxes: pick('车厢') }
}

function mapSupplier(record, configs) {
  const f = record.fields
  const name = nameOf(record)
  const fleetScale = parseFleetScale(f['车队规模'])
  const warehouseInfo = text(f['仓库信息'])
  return {
    id: record.record_id, // 用飞书记录 id 作为稳定 id
    feishuRecordId: record.record_id,
    name,
    contract: text(f['是否签署合同']),
    paymentTerms: text(f['供应商账期']),
    intro: text(f['公司介绍']),
    status: text(f['合作状态']),
    entity: text(f['合作主体']),
    internalContact: list(f['内部对接人']),
    pools: list(f['资源盘归属']),
    reconPerson: text(f['对账人']),
    capacity: text(f['供应商承接能力']),
    fleet: {
      has: text(f['是否自有车队']) === '是',
      trucks: fleetScale.trucks,
      frames: fleetScale.frames,
      boxes: fleetScale.boxes,
    },
    warehouse: {
      has: text(f['是否自有仓库']) === '是',
      list: warehouseInfo ? [{ name: warehouseInfo, address: '', area: '' }] : [],
    },
    contacts: configs.contacts
      .filter((x) => nameOf(x) === name)
      .map((x) => ({
        name: text(x.fields['供应商联系人']),
        title: text(x.fields['职务']),
        methods: text(x.fields['联系方式']),
        note: text(x.fields['备注']),
      })),
    cnConfigs: configs.configs
      .filter((x) => nameOf(x) === name && text(x.fields['资源池']) === '国内盘')
      .map((x) => ({
        region: list(x.fields['适用区域'])[0] || '',
        bizTypes: list(x.fields['业务类型']),
        scenarios: list(x.fields['服务场景']),
        fbaNote: text(x.fields['FBA 备注']),
        fbxNote: text(x.fields['FBX 备注']),
        note: text(x.fields['配置备注']),
      })),
    abilityConfigs: configs.configs
      .filter((x) => nameOf(x) === name && text(x.fields['资源池']) !== '国内盘')
      .map((x) => ({
        region: list(x.fields['适用区域'])[0] || '',
        abilities: list(x.fields['资源能力']),
        note: text(x.fields['配置备注']),
      })),
    usPool: [...new Set(
      configs.configs
        .filter((x) => nameOf(x) === name && text(x.fields['资源池']) !== '国内盘')
        .map((x) => text(x.fields['资源池']))
        .filter(Boolean)
    )],
    remark: text(f['补充备注']),
    evaluation: text(f['供应商评价']),
  }
}

export async function getSuppliers() {
  const [suppliers, configs, contacts] = await Promise.all([
    listRecords(feishuConfig.tables.suppliers),
    listRecords(feishuConfig.tables.configs),
    listRecords(feishuConfig.tables.contacts),
  ])
  const ctx = { configs, contacts }
  return suppliers
    .filter((record) => nameOf(record))
    .map((record) => mapSupplier(record, ctx))
}
