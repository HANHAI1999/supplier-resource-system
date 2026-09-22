import { feishuConfig } from '../config/feishu.js'
import { list, listRecords, text } from './feishu.js'

const idOf = (record) => text(record.fields.supplier_id)

function mapSupplier(record, configs) {
  const f = record.fields
  const supplierId = idOf(record)
  return {
    id: supplierId,
    name: text(f['供应商名称']),
    country: text(f['国家']),
    contract: text(f['是否签署合同']),
    paymentTerms: text(f['供应商账期']),
    intro: text(f['公司介绍']),
    status: text(f['合作状态']),
    entity: text(f['合作主体']),
    internalContact: text(f['内部对接人']),
    pools: list(f['资源盘归属']),
    fleet: { has: text(f['是否自有车队']) === '是', trucks: text(f['车头数量']), frames: text(f['车架数量']), boxes: text(f['车厢数量']) },
    warehouse: { has: text(f['是否自有仓库']) === '是', list: configs.warehouses.filter((x) => idOf(x) === supplierId).map((x) => ({ name: text(x.fields['仓库信息']), note: text(x.fields['仓库备注']) })) },
    contacts: configs.contacts.filter((x) => idOf(x) === supplierId).map((x) => ({ name: text(x.fields['供应商联系人']), note: text(x.fields['联系人备注']), title: text(x.fields['职务']), methods: text(x.fields['联系方式']), group: text(x.fields['对接群']) })),
    cnConfigs: configs.domestic.filter((x) => idOf(x) === supplierId).map((x) => ({ region: list(x.fields['适用区域']), bizTypes: list(x.fields['业务类型']), scenarios: list(x.fields['服务场景']), amazonNote: text(x.fields['Amazon备注']), commercialAddressNote: text(x.fields['商业地址备注']), note: text(x.fields['配置备注']) })),
    abilityConfigs: configs.us.filter((x) => idOf(x) === supplierId).map((x) => ({ region: list(x.fields['适用区域']), usPool: list(x.fields['美国资源池归属']), abilities: list(x.fields['资源能力']), note: text(x.fields['配置备注']) })),
    remark: text(f['补充备注']),
  }
}

export async function getSuppliers() {
  const [suppliers, domestic, us, contacts, warehouses] = await Promise.all([
    listRecords(feishuConfig.tables.suppliers), listRecords(feishuConfig.tables.domesticConfigs), listRecords(feishuConfig.tables.usConfigs), listRecords(feishuConfig.tables.contacts), listRecords(feishuConfig.tables.warehouses),
  ])
  const configs = { domestic, us, contacts, warehouses }
  return suppliers.filter((record) => idOf(record)).map((record) => mapSupplier(record, configs))
}
