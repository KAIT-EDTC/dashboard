import { useEffect, useState } from 'react'
import { client } from '../../../lib/hono'

type Equipment = {
  id: string,
  name: string,
  count: number,
  located: string
}

export const EquipmentList = () => {
  const [data, setData] = useState<Equipment[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const res = await client.api.equipment.list.$get()
      const json: { data: Equipment[] } = await res.json()
      setData(json.data)
    }
    fetchData()
  }, [])

  return (
    <div>
      <h2>備品一覧</h2>
      <ul>
        {data.map((item) => (
          <li key={item.id}>
            {item.name} ({item.count}) - {item.located}
          </li>
        ))}
      </ul>
    </div>
  )
}

