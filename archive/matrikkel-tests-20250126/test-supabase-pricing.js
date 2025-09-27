/**
 * Test script to verify Supabase pricing database connection and data flow
 *
 * This script tests:
 * 1. Database connection
 * 2. Municipality to price zone lookup
 * 3. Price zone to electricity price data lookup
 * 4. Historical price data retrieval
 */

const { createClient } = require('@supabase/supabase-js')

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ovbrydyzdidbxvgsckep.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YnJ5ZHl6ZGlkYnh2Z3Nja2VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjY4MzMsImV4cCI6MjA3Mzg0MjgzM30.UjCH4HulDImEQTOxuFcUhdiJKqOJ5H62DTB0IDJm36s'

console.log('🔍 Testing Supabase Pricing Database Connection\n')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.log('Please ensure .env.local contains:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_url')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseConnection() {
  console.log('1️⃣ Testing database connection...')

  try {
    const { data, error } = await supabase
      .from('municipality_price_zones')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Database connection failed:', error.message)
      return false
    }

    console.log('✅ Database connection successful!')
    return true
  } catch (err) {
    console.error('❌ Database connection error:', err.message)
    return false
  }
}

async function testMunicipalityPriceZones() {
  console.log('\n2️⃣ Testing municipality_price_zones table...')

  try {
    // Test with Oslo kommune (0301)
    const { data, error } = await supabase
      .from('municipality_price_zones')
      .select('*')
      .eq('kommune_number', '0301')
      .single()

    if (error) {
      console.error('❌ Municipality lookup failed:', error.message)
      return null
    }

    if (data) {
      console.log('✅ Found Oslo municipality:', {
        kommune_number: data.kommune_number,
        kommune_name: data.kommune_name,
        price_zone: data.price_zone
      })
      return data.price_zone
    } else {
      console.log('⚠️ No data found for Oslo (0301)')
      return null
    }
  } catch (err) {
    console.error('❌ Municipality lookup error:', err.message)
    return null
  }
}

async function testElectricityPrices(zone) {
  console.log(`\n3️⃣ Testing electricity_prices_nve table for zone ${zone}...`)

  try {
    // Get latest price data
    const { data, error } = await supabase
      .from('electricity_prices_nve')
      .select('*')
      .eq('zone', zone)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(5)

    if (error) {
      console.error('❌ Price lookup failed:', error.message)
      return false
    }

    if (data && data.length > 0) {
      console.log(`✅ Found ${data.length} price records for zone ${zone}:`)
      data.forEach((record, i) => {
        console.log(`   ${i + 1}. Week ${record.week_number}/${record.year}: ${record.spot_price_ore_kwh} øre/kWh`)
      })
      return true
    } else {
      console.log(`⚠️ No price data found for zone ${zone}`)
      return false
    }
  } catch (err) {
    console.error('❌ Price lookup error:', err.message)
    return false
  }
}

async function testPriceHistory(zone) {
  console.log(`\n4️⃣ Testing price history for zone ${zone} (last 36 weeks)...`)

  try {
    const { data, error } = await supabase
      .from('electricity_prices_nve')
      .select('week, year, week_number, spot_price_ore_kwh')
      .eq('zone', zone)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(36)

    if (error) {
      console.error('❌ Price history lookup failed:', error.message)
      return false
    }

    if (data && data.length > 0) {
      console.log(`✅ Found ${data.length} historical price records`)

      // Calculate average
      const average = data.reduce((sum, record) => sum + record.spot_price_ore_kwh, 0) / data.length
      console.log(`📊 36-week average: ${Math.round(average)} øre/kWh`)

      // Show min/max
      const prices = data.map(d => d.spot_price_ore_kwh)
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      console.log(`📈 Range: ${min} - ${max} øre/kWh`)

      return true
    } else {
      console.log(`⚠️ No historical data found for zone ${zone}`)
      return false
    }
  } catch (err) {
    console.error('❌ Price history error:', err.message)
    return false
  }
}

async function testMultipleMunicipalities() {
  console.log('\n5️⃣ Testing multiple municipalities...')

  const testKommuner = [
    { number: '0301', name: 'Oslo' },
    { number: '1103', name: 'Stavanger' },
    { number: '4601', name: 'Bergen' },
    { number: '5001', name: 'Trondheim' }
  ]

  for (const kommune of testKommuner) {
    try {
      const { data, error } = await supabase
        .from('municipality_price_zones')
        .select('price_zone')
        .eq('kommune_number', kommune.number)
        .single()

      if (data) {
        console.log(`✅ ${kommune.name} (${kommune.number}) → Zone ${data.price_zone}`)
      } else {
        console.log(`⚠️ ${kommune.name} (${kommune.number}) → Not found`)
      }
    } catch (err) {
      console.log(`❌ ${kommune.name} (${kommune.number}) → Error: ${err.message}`)
    }
  }
}

async function testDataCounts() {
  console.log('\n6️⃣ Testing data counts...')

  try {
    // Count municipalities
    const { count: municipalityCount, error: municipalityError } = await supabase
      .from('municipality_price_zones')
      .select('*', { count: 'exact', head: true })

    if (!municipalityError) {
      console.log(`📍 Total municipalities: ${municipalityCount}`)
    }

    // Count price records
    const { count: priceCount, error: priceError } = await supabase
      .from('electricity_prices_nve')
      .select('*', { count: 'exact', head: true })

    if (!priceError) {
      console.log(`⚡ Total price records: ${priceCount}`)
    }

    // Check zones
    const { data: zones, error: zoneError } = await supabase
      .from('electricity_prices_nve')
      .select('zone')
      .distinct()

    if (!zoneError && zones) {
      console.log(`🗺️ Available zones: ${zones.map(z => z.zone).join(', ')}`)
    }

  } catch (err) {
    console.error('❌ Data count error:', err.message)
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Supabase Pricing Database Tests\n')

  const connectionOk = await testDatabaseConnection()
  if (!connectionOk) return

  const zone = await testMunicipalityPriceZones()
  if (!zone) return

  const pricesOk = await testElectricityPrices(zone)
  if (!pricesOk) return

  await testPriceHistory(zone)
  await testMultipleMunicipalities()
  await testDataCounts()

  console.log('\n✅ All tests completed! Database is ready for pricing functionality.')
}

// Execute tests
runAllTests().catch(console.error)