import React, { useEffect, useState } from 'react';
import { Gem, Sparkles } from 'lucide-react';
import { Protect, useAuth } from '@clerk/clerk-react';
import CreationsItem from '../components/CreationsItem';
import axios from 'axios';
import toast from 'react-hot-toast';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const Dashboard = () => {
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  const getDashboardData = async () => {
    setLoading(true);
    try {
      const token = await getToken();

      const { data } = await axios.get('/api/user/get-user-creations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        setCreations(data.creations);
      } else {
        toast.error(data.message || 'Something went wrong');
      }
    } catch (error) {
      if (error.response) {
        toast.error(error.response.data.message || 'Server error');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDashboardData();
  }, []);

  return (
    <div className="h-full overflow-y-scroll p-6">
      <div className="flex justify-start gap-4 flex-wrap">
        {/* Total Creations Card */}
        <div className="flex justify-between items-center w-72 p-4 px-6 bg-white rounded-xl border border-gray-200">
          <div className="text-slate-600">
            <p className="text-sm">Total Creations</p>
            <h2 className="text-xl font-semibold">{creations.length}</h2>
          </div>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3588F2] to-[#0BB0D7] flex justify-center items-center">
            <Sparkles className="w-5 text-white" />
          </div>
        </div>

        {/* Active Plan Card */}
        <div className="flex justify-between items-center w-72 p-4 px-6 bg-white rounded-xl border border-gray-200">
          <div className="text-slate-600">
            <p className="text-sm">Active Plan</p>
            <h2 className="text-xl font-semibold">
              <Protect role="org:admin" fallback="Free">
                Premium
              </Protect>
            </h2>
          </div>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF61C5] to-[#9E53EE] flex justify-center items-center">
            <Gem className="w-5 text-white" />
          </div>
        </div>
      </div>

      {/* Recent Creations */}
      {loading ? (
        <div className="flex justify-center items-center h-3/4">
          <div className="w-4 h-4 my-1 rounded-full border-2 border-t-transparent animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="mt-6 mb-4">Recent Creations</p>
          {creations.length > 0 ? (
            creations.map((item) => (
              <CreationsItem key={item.id} item={item} />
            ))
          ) : (
            <p className="text-gray-500">No creations found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
