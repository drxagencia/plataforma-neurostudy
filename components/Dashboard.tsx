import React, { useState, useEffect } from 'react';
import { User, Announcement } from '../types';
import { DatabaseService } from '../services/databaseService';
import { Clock, Target, TrendingUp, Trophy, Loader2 } from 'lucide-react';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      const data = await DatabaseService.getAnnouncements();
      setAnnouncements(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Carousel Rotation
  useEffect(() => {
    if (announcements.length === 0) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">Olá, {user.displayName.split(' ')[0]} 👋</h2>
          <p className="text-slate-400">Continue de onde você parou.</p>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">
            {user.isAdmin ? 'Administrador' : 'Plano Pro'}
          </p>
          {!user.isAdmin && <p className="text-indigo-400 text-xs">Válido até Dez/2025</p>}
        </div>
      </header>

      {/* Announcements Carousel */}
      {announcements.length > 0 && (
        <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/10 group border border-white/10">
          {announcements.map((ad, index) => (
            <div
              key={ad.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent z-10" />
              <img 
                src={ad.image} 
                alt={ad.title} 
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
              />
              <div className="absolute bottom-0 left-0 p-8 z-20 max-w-xl">
                <span className="inline-block px-3 py-1 bg-indigo-600/80 backdrop-blur text-white text-xs font-bold rounded-full mb-3 shadow-[0_0_10px_rgba(79,70,229,0.4)]">
                  DESTAQUE
                </span>
                <h3 className="text-3xl font-bold text-white mb-2">{ad.title}</h3>
                <p className="text-slate-200 mb-6 text-lg">{ad.description}</p>
                <button className="px-6 py-3 bg-white text-slate-900 font-bold rounded-lg hover:bg-indigo-50 transition-colors shadow-lg">
                  {ad.ctaText}
                </button>
              </div>
            </div>
          ))}
          
          {/* Indicators */}
          <div className="absolute bottom-4 right-4 z-30 flex gap-2">
            {announcements.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  activeSlide === idx ? 'w-8 bg-indigo-500' : 'bg-slate-600 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Clock className="text-blue-400" />, label: 'Horas Estudadas', value: '32.5h' },
          { icon: <Target className="text-emerald-400" />, label: 'Questões Feitas', value: '1,240' },
          { icon: <TrendingUp className="text-purple-400" />, label: 'Média Geral', value: '78%' },
          { icon: <Trophy className="text-yellow-400" />, label: 'Ranking', value: '#42' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900/50 backdrop-blur-md border border-white/5 p-6 rounded-xl hover:border-indigo-500/30 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">
                {stat.icon}
              </div>
            </div>
            <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;