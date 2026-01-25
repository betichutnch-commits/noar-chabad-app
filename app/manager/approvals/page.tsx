"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ManagerHeader } from '@/components/layout/ManagerHeader'
import { Loader2, MapPin, Search, Eye } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'

export default function ApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    const { data } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setTrips(data);
    setLoading(false);
  };

  const filteredTrips = trips.filter(trip => {
      const matchesStatus = filter === 'all' ? true : trip.status === filter;
      const matchesSearch = trip.name?.includes(searchTerm) || 
                            trip.branch?.includes(searchTerm) || 
                            trip.coordinator_name?.includes(searchTerm);
      return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
      const styles: any = {
          approved: "bg-green-100 text-green-700 border-green-200",
          pending: "bg-orange-100 text-orange-700 border-orange-200",
          rejected: "bg-red-100 text-red-700 border-red-200"
      };
      const labels: any = { approved: 'אושר', pending: 'ממתין', rejected: 'נדחה' };
      return (
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.pending}`}>
              {labels[status]}
          </span>
      );
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400"/></div>;

  return (
    <>
        <ManagerHeader title="אישור ובקרת טיולים" />

        <div className="p-8 animate-fadeIn pb-32">
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                    {['pending', 'approved', 'rejected', 'all'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all
                            ${filter === f ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            {f === 'pending' ? 'ממתינים' : f === 'approved' ? 'אושרו' : f === 'rejected' ? 'נדחו' : 'הכל'}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-80">
                    <Input 
                        placeholder="חיפוש לפי שם, סניף או רכז..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        icon={<Search size={18}/>}
                        className="bg-white"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-bold uppercase">
                            <tr>
                                <th className="p-5">שם הטיול</th>
                                <th className="p-5">רכז / סניף</th>
                                <th className="p-5">תאריכים</th>
                                <th className="p-5">סטטוס</th>
                                <th className="p-5 text-left">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredTrips.map((trip) => (
                                <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-5">
                                        <div className="font-bold text-gray-800">{trip.name}</div>
                                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                            <MapPin size={12}/> {trip.details?.timeline?.[0]?.finalLocation || 'לא צוין מיקום'}
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs shrink-0">
                                                {trip.coordinator_name?.[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-700 text-sm">{trip.coordinator_name}</div>
                                                <div className="text-xs text-gray-400">{trip.branch}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5 text-sm font-medium text-gray-600">
                                        {new Date(trip.start_date).toLocaleDateString('he-IL')}
                                    </td>
                                    <td className="p-5">
                                        {getStatusBadge(trip.status)}
                                    </td>
                                    <td className="p-5 text-left">
                                        <Link href={`/manager/approvals/${trip.id}`}>
                                            <button className="bg-[#00BCD4] hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-cyan-100 transition-all flex items-center gap-2 ml-auto">
                                                <Eye size={16}/> צפה וטפל
                                            </button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredTrips.length === 0 && <div className="p-12 text-center text-gray-400 font-medium">לא נמצאו טיולים</div>}
            </div>
        </div>
    </>
  )
}