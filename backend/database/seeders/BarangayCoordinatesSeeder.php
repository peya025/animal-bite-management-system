<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BarangayCoordinatesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $coordinates = [
            // Tagoloan Barangays
            ['barangay' => 'Baluarte', 'municipality' => 'Tagoloan', 'province' => 'Misamis Oriental', 'latitude' => 8.5408, 'longitude' => 124.7461, 'source' => 'manual'],
            ['barangay' => 'Natumolan', 'municipality' => 'Tagoloan', 'province' => 'Misamis Oriental', 'latitude' => 8.5299, 'longitude' => 124.7523, 'source' => 'manual'],
            ['barangay' => 'Gracia', 'municipality' => 'Tagoloan', 'province' => 'Misamis Oriental', 'latitude' => 8.5245, 'longitude' => 124.7389, 'source' => 'manual'],
            ['barangay' => 'Poblacion', 'municipality' => 'Tagoloan', 'province' => 'Misamis Oriental', 'latitude' => 8.5367, 'longitude' => 124.7445, 'source' => 'manual'],
            ['barangay' => 'Rosario', 'municipality' => 'Tagoloan', 'province' => 'Misamis Oriental', 'latitude' => 8.5489, 'longitude' => 124.7512, 'source' => 'manual'],
            ['barangay' => 'San Francisco', 'municipality' => 'Tagoloan', 'province' => 'Misamis Oriental', 'latitude' => 8.5512, 'longitude' => 124.7389, 'source' => 'manual'],
            ['barangay' => 'San Isidro', 'municipality' => 'Tagoloan', 'province' => 'Misamis Oriental', 'latitude' => 8.5334, 'longitude' => 124.7567, 'source' => 'manual'],
            ['barangay' => 'Sta. Ana', 'municipality' => 'Tagoloan', 'province' => 'Misamis Oriental', 'latitude' => 8.5423, 'longitude' => 124.7623, 'source' => 'manual'],
            ['barangay' => 'Tugatog', 'municipality' => 'Tagoloan', 'province' => 'Misamis Oriental', 'latitude' => 8.5567, 'longitude' => 124.7434, 'source' => 'manual'],
            ['barangay' => 'Upper Becerril', 'municipality' => 'Tagoloan', 'province' => 'Misamis Oriental', 'latitude' => 8.5289, 'longitude' => 124.7678, 'source' => 'manual'],
            ['barangay' => 'Lower Becerril', 'municipality' => 'Tagoloan', 'province' => 'Misamis Oriental', 'latitude' => 8.5234, 'longitude' => 124.7534, 'source' => 'manual'],

            // Cagayan de Oro Barangays (Major ones)
            ['barangay' => 'Carmen', 'municipality' => 'Cagayan de Oro', 'province' => 'Misamis Oriental', 'latitude' => 8.4822, 'longitude' => 124.6472, 'source' => 'manual'],
            ['barangay' => 'Lapasan', 'municipality' => 'Cagayan de Oro', 'province' => 'Misamis Oriental', 'latitude' => 8.4567, 'longitude' => 124.6234, 'source' => 'manual'],
            ['barangay' => 'Macasandig', 'municipality' => 'Cagayan de Oro', 'province' => 'Misamis Oriental', 'latitude' => 8.4889, 'longitude' => 124.6389, 'source' => 'manual'],
            ['barangay' => 'Kauswagan', 'municipality' => 'Cagayan de Oro', 'province' => 'Misamis Oriental', 'latitude' => 8.4678, 'longitude' => 124.6523, 'source' => 'manual'],
            ['barangay' => 'Balulang', 'municipality' => 'Cagayan de Oro', 'province' => 'Misamis Oriental', 'latitude' => 8.5123, 'longitude' => 124.6234, 'source' => 'manual'],
            ['barangay' => 'Bulua', 'municipality' => 'Cagayan de Oro', 'province' => 'Misamis Oriental', 'latitude' => 8.4456, 'longitude' => 124.6678, 'source' => 'manual'],
            ['barangay' => 'Indahag', 'municipality' => 'Cagayan de Oro', 'province' => 'Misamis Oriental', 'latitude' => 8.4756, 'longitude' => 124.6445, 'source' => 'manual'],
            ['barangay' => 'Nazareth', 'municipality' => 'Cagayan de Oro', 'province' => 'Misamis Oriental', 'latitude' => 8.4934, 'longitude' => 124.6556, 'source' => 'manual'],
            ['barangay' => 'Puerto', 'municipality' => 'Cagayan de Oro', 'province' => 'Misamis Oriental', 'latitude' => 8.4523, 'longitude' => 124.6389, 'source' => 'manual'],
            ['barangay' => 'Gusa', 'municipality' => 'Cagayan de Oro', 'province' => 'Misamis Oriental', 'latitude' => 8.5045, 'longitude' => 124.6234, 'source' => 'manual'],

            // Opol Barangays
            ['barangay' => 'Poblacion', 'municipality' => 'Opol', 'province' => 'Misamis Oriental', 'latitude' => 8.5167, 'longitude' => 124.5667, 'source' => 'manual'],
            ['barangay' => 'Bonbon', 'municipality' => 'Opol', 'province' => 'Misamis Oriental', 'latitude' => 8.5234, 'longitude' => 124.5789, 'source' => 'manual'],
            ['barangay' => 'Cauyonan', 'municipality' => 'Opol', 'province' => 'Misamis Oriental', 'latitude' => 8.5089, 'longitude' => 124.5534, 'source' => 'manual'],
            ['barangay' => 'Lower Patag', 'municipality' => 'Opol', 'province' => 'Misamis Oriental', 'latitude' => 8.5312, 'longitude' => 124.5612, 'source' => 'manual'],
            ['barangay' => 'Upper Patag', 'municipality' => 'Opol', 'province' => 'Misamis Oriental', 'latitude' => 8.5389, 'longitude' => 124.5723, 'source' => 'manual'],

            // Villanueva Barangays
            ['barangay' => 'Poblacion', 'municipality' => 'Villanueva', 'province' => 'Misamis Oriental', 'latitude' => 8.5667, 'longitude' => 124.7333, 'source' => 'manual'],
            ['barangay' => 'Balacanas', 'municipality' => 'Villanueva', 'province' => 'Misamis Oriental', 'latitude' => 8.5745, 'longitude' => 124.7456, 'source' => 'manual'],
            ['barangay' => 'Dayawan', 'municipality' => 'Villanueva', 'province' => 'Misamis Oriental', 'latitude' => 8.5589, 'longitude' => 124.7234, 'source' => 'manual'],
            ['barangay' => 'Kimaya', 'municipality' => 'Villanueva', 'province' => 'Misamis Oriental', 'latitude' => 8.5823, 'longitude' => 124.7389, 'source' => 'manual'],

            // Balingasag Barangays
            ['barangay' => 'Poblacion', 'municipality' => 'Balingasag', 'province' => 'Misamis Oriental', 'latitude' => 8.7500, 'longitude' => 124.7833, 'source' => 'manual'],
            ['barangay' => 'Baliwagan', 'municipality' => 'Balingasag', 'province' => 'Misamis Oriental', 'latitude' => 8.7389, 'longitude' => 124.7912, 'source' => 'manual'],
            ['barangay' => 'Dumarait', 'municipality' => 'Balingasag', 'province' => 'Misamis Oriental', 'latitude' => 8.7623, 'longitude' => 124.7745, 'source' => 'manual'],
            ['barangay' => 'Kauswagan', 'municipality' => 'Balingasag', 'province' => 'Misamis Oriental', 'latitude' => 8.7456, 'longitude' => 124.7889, 'source' => 'manual'],

            // Jasaan Barangays
            ['barangay' => 'Poblacion', 'municipality' => 'Jasaan', 'province' => 'Misamis Oriental', 'latitude' => 8.6500, 'longitude' => 124.7500, 'source' => 'manual'],
            ['barangay' => 'Aplaya', 'municipality' => 'Jasaan', 'province' => 'Misamis Oriental', 'latitude' => 8.6389, 'longitude' => 124.7623, 'source' => 'manual'],
            ['barangay' => 'Corrales', 'municipality' => 'Jasaan', 'province' => 'Misamis Oriental', 'latitude' => 8.6623, 'longitude' => 124.7456, 'source' => 'manual'],
            ['barangay' => 'Solana', 'municipality' => 'Jasaan', 'province' => 'Misamis Oriental', 'latitude' => 8.6456, 'longitude' => 124.7678, 'source' => 'manual'],

            // Alubijid Barangays
            ['barangay' => 'Poblacion', 'municipality' => 'Alubijid', 'province' => 'Misamis Oriental', 'latitude' => 8.5667, 'longitude' => 124.4667, 'source' => 'manual'],
            ['barangay' => 'Nabaliwa', 'municipality' => 'Alubijid', 'province' => 'Misamis Oriental', 'latitude' => 8.5745, 'longitude' => 124.4534, 'source' => 'manual'],
            ['barangay' => 'San Vicente', 'municipality' => 'Alubijid', 'province' => 'Misamis Oriental', 'latitude' => 8.5589, 'longitude' => 124.4789, 'source' => 'manual'],

            // Laguindingan Barangays
            ['barangay' => 'Poblacion', 'municipality' => 'Laguindingan', 'province' => 'Misamis Oriental', 'latitude' => 8.5667, 'longitude' => 124.4500, 'source' => 'manual'],
            ['barangay' => 'Lapad', 'municipality' => 'Laguindingan', 'province' => 'Misamis Oriental', 'latitude' => 8.5745, 'longitude' => 124.4623, 'source' => 'manual'],
            ['barangay' => 'Mauswagon', 'municipality' => 'Laguindingan', 'province' => 'Misamis Oriental', 'latitude' => 8.5589, 'longitude' => 124.4389, 'source' => 'manual'],

            // Gitagum Barangays
            ['barangay' => 'Poblacion', 'municipality' => 'Gitagum', 'province' => 'Misamis Oriental', 'latitude' => 8.6167, 'longitude' => 124.4000, 'source' => 'manual'],
            ['barangay' => 'Bangbangon', 'municipality' => 'Gitagum', 'province' => 'Misamis Oriental', 'latitude' => 8.6245, 'longitude' => 124.4123, 'source' => 'manual'],
            ['barangay' => 'Domolok', 'municipality' => 'Gitagum', 'province' => 'Misamis Oriental', 'latitude' => 8.6089, 'longitude' => 124.3889, 'source' => 'manual'],

            // Initao Barangays
            ['barangay' => 'Poblacion', 'municipality' => 'Initao', 'province' => 'Misamis Oriental', 'latitude' => 8.5000, 'longitude' => 124.3167, 'source' => 'manual'],
            ['barangay' => 'Aposkahoy', 'municipality' => 'Initao', 'province' => 'Misamis Oriental', 'latitude' => 8.5089, 'longitude' => 124.3289, 'source' => 'manual'],
            ['barangay' => 'Dimaluna', 'municipality' => 'Initao', 'province' => 'Misamis Oriental', 'latitude' => 8.4912, 'longitude' => 124.3056, 'source' => 'manual'],
        ];

        foreach ($coordinates as $coord) {
            DB::table('barangay_coordinates')->insert(array_merge($coord, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
