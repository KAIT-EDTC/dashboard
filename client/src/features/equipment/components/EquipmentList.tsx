import { useEffect, useState } from 'react'
import { client } from '../../../lib/hono'

export const EquipmentList = () => {
  const [data, setData] = useState<string>('')

  useEffect(() => {
    const fetchData = async () => {
      const res = await client.api.hello.$get()
      const json = await res.json()
      setData(json.message)
    }
    fetchData()
  }, [])

  return (
    <div>
      <h2>備品一覧</h2>
      <p>Server says: {data}</p>
    </div>
  )
}

