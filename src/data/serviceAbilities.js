// 服务能力树：严格照需求文档第 5.3 节
export const serviceAbilityTree = [
  {
    value: '提柜供应商',
    label: '提柜供应商',
    children: [
      { value: '提柜', label: '提柜' },
      { value: '整柜直送', label: '整柜直送' },
    ],
  },
  {
    value: '派送供应商',
    label: '派送供应商',
    children: [
      {
        value: '53尺派送',
        label: '53尺派送',
        children: [
          {
            value: '派送类型',
            label: '派送类型',
            children: [
              { value: 'Solo', label: 'Solo' },
              { value: 'Team', label: 'Team' },
            ],
          },
        ],
      },
      { value: '26尺派送', label: '26尺派送' },
      { value: 'Broker', label: 'Broker' },
      { value: 'LTL平台', label: 'LTL平台' },
      { value: '同行类散板车队', label: '同行类散板车队' },
    ],
  },
  {
    value: '仓储类供应商',
    label: '仓储类供应商',
    children: [
      { value: '倒货', label: '倒货' },
      { value: '拆柜合作', label: '拆柜合作' },
    ],
  },
]
