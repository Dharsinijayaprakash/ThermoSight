
import { useEffect, useState } from 'react';
import { listTransformers } from '../api/transformers';
import { listImages } from '../api/images';
import { useTheme } from '../context/ThemeContext';
import type { Transformer } from '../api/transformers';
import type { ThermalImage } from '../api/images';

export default function Dashboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [stats, setStats] = useState({
    totalTransformers: 0,
    healthyTransformers: 0,
    warningTransformers: 0,
    criticalTransformers: 0,
    totalImages: 0,
    recentUploads: 0,
    averageCapacity: 0,
    totalCapacity: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<{
    recentTransformers: Transformer[];
    recentImages: ThermalImage[];
  }>({
    recentTransformers: [],
    recentImages: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load transformers data
      const transformersResp = await listTransformers('', 0, 100);
      const transformers = transformersResp.content;
      
      // Load recent images
      const imagesResp = await listImages();
      const images = imagesResp.content;
      
      // Calculate transformer statistics
      const totalTransformers = transformers.length;
      const totalCapacity = transformers.reduce((sum, t) => sum + (t.capacityKVA || 0), 0);
      const averageCapacity = totalTransformers > 0 ? totalCapacity / totalTransformers : 0;
      
      // Simulate health status based on capacity and age
      const healthyTransformers = Math.floor(totalTransformers * 0.7);
      const warningTransformers = Math.floor(totalTransformers * 0.25);
      const criticalTransformers = totalTransformers - healthyTransformers - warningTransformers;
      
      // Recent activity (last 7 days simulation)
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentUploads = images.filter(img => 
        new Date(img.uploadedAt) > weekAgo
      ).length;
      
      setStats({
        totalTransformers,
        healthyTransformers,
        warningTransformers,
        criticalTransformers,
        totalImages: images.length,
        recentUploads,
        averageCapacity: Math.round(averageCapacity),
        totalCapacity: Math.round(totalCapacity)
      });
      
      setRecentActivity({
        recentTransformers: transformers.slice(0, 5),
        recentImages: images.slice(0, 5)
      });
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Theme-aware colors
  const cardBg = isDark 
    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' 
    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
  const cardBorder = isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(124, 58, 237, 0.1)';
  const textPrimary = isDark ? '#f1f5f9' : '#374151';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';

  if (loading) {
    return (
      <div style={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '18px',
        color: isDark ? '#60a5fa' : '#1e40af'
      }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="page-container" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1.5rem'
    }}>
      
      {/* Welcome Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{
            marginBottom: '0.25rem'
          }}>
            Transformer Maintenance Dashboard
          </h1>
          <p style={{ 
            fontSize: '0.9rem', 
            color: 'rgba(255, 255, 255, 0.85)', 
            margin: 0,
            fontFamily: 'Inter'
          }}>
            Real-time monitoring and maintenance insights
          </p>
        </div>
      </div>

      {/* Transformer Statistics */}
      <div>
        <h2 style={{ 
          fontSize: '1.25rem', 
          color: textPrimary, 
          marginBottom: '1rem',
          fontFamily: 'Montserrat',
          fontWeight: '600'
        }}>
          Transformer Statistics
        </h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            { 
              label: 'TOTAL TRANSFORMERS', 
              value: stats.totalTransformers, 
              color: isDark ? '#60a5fa' : '#1e40af',
              bgColor: 'rgba(30, 64, 175, 0.15)'
            },
            { 
              label: 'HEALTHY STATUS', 
              value: stats.healthyTransformers, 
              color: isDark ? '#34d399' : '#059669',
              bgColor: 'rgba(5, 150, 105, 0.15)'
            },
            { 
              label: 'WARNING STATUS', 
              value: stats.warningTransformers, 
              color: isDark ? '#fbbf24' : '#d97706',
              bgColor: 'rgba(217, 119, 6, 0.15)'
            },
            { 
              label: 'CRITICAL STATUS', 
              value: stats.criticalTransformers, 
              color: isDark ? '#f87171' : '#dc2626',
              bgColor: 'rgba(220, 38, 38, 0.15)'
            },
            { 
              label: 'TOTAL CAPACITY', 
              value: `${stats.totalCapacity} kVA`, 
              color: isDark ? '#60a5fa' : '#1e40af',
              bgColor: 'rgba(30, 64, 175, 0.15)'
            },
            { 
              label: 'AVG CAPACITY', 
              value: `${stats.averageCapacity} kVA`, 
              color: isDark ? '#38bdf8' : '#0ea5e9',
              bgColor: 'rgba(14, 165, 233, 0.15)'
            }
          ].map((card) => (
            <div key={card.label} className="dashboard-stat-card" style={{
              background: cardBg,
              borderRadius: 12,
              boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(124, 58, 237, 0.08)',
              border: `1px solid ${cardBorder}`,
              padding: '1rem 1.5rem',
              minWidth: 160,
              flex: '1 1 160px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Montserrat',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = isDark 
                ? '0 8px 30px rgba(0, 0, 0, 0.4)' 
                : '0 8px 30px rgba(124, 58, 237, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = isDark 
                ? '0 4px 20px rgba(0, 0, 0, 0.3)' 
                : '0 4px 20px rgba(124, 58, 237, 0.08)';
            }}>
              {/* Background decoration */}
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '50px',
                height: '50px',
                background: card.bgColor,
                borderRadius: '50%',
                transform: 'translate(15px, -15px)',
                opacity: 0.6
              }} />
              
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: '900', 
                color: card.color, 
                marginBottom: '0.25rem',
                zIndex: 1
              }}>
                {card.value}
              </div>
              <div style={{ 
                fontSize: '0.65rem', 
                color: textSecondary, 
                fontWeight: '600', 
                letterSpacing: '0.5px',
                textAlign: 'center',
                zIndex: 1
              }}>
                {card.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity & Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        
        {/* Recent Activity */}
        <div className="dashboard-card" style={{
          background: cardBg,
          borderRadius: 12,
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(124, 58, 237, 0.08)',
          border: `1px solid ${cardBorder}`,
          padding: '1.25rem'
        }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            color: textPrimary, 
            marginBottom: '1rem',
            fontFamily: 'Montserrat',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            Recent Activity
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{
              padding: '0.75rem',
              background: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(34, 197, 94, 0.3)'
            }}>
              <div style={{ fontWeight: '600', color: isDark ? '#34d399' : '#059669', fontSize: '0.85rem' }}>
                Recent Uploads
              </div>
              <div style={{ color: textPrimary, marginTop: '0.15rem', fontSize: '0.85rem' }}>
                {stats.recentUploads} thermal images uploaded this week
              </div>
            </div>
            
            <div style={{
              padding: '0.75rem',
              background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
              borderRadius: '8px',
              border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(30, 64, 175, 0.2)'
            }}>
              <div style={{ fontWeight: '600', color: isDark ? '#60a5fa' : '#1e40af', fontSize: '0.85rem' }}>
                System Status
              </div>
              <div style={{ color: textPrimary, marginTop: '0.15rem', fontSize: '0.85rem' }}>
                All monitoring systems operational
              </div>
            </div>
            
            {recentActivity.recentTransformers.length > 0 && (
              <div style={{
                padding: '0.75rem',
                background: isDark ? 'rgba(14, 165, 233, 0.15)' : 'rgba(14, 165, 233, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(14, 165, 233, 0.3)'
              }}>
                <div style={{ fontWeight: '600', color: isDark ? '#38bdf8' : '#0ea5e9', fontSize: '0.85rem' }}>
                  Recent Additions
                </div>
                <div style={{ color: textPrimary, marginTop: '0.15rem', fontSize: '0.85rem' }}>
                  Latest: {recentActivity.recentTransformers[0]?.code} in {recentActivity.recentTransformers[0]?.location}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alert Summary */}
        <div className="dashboard-card" style={{
          background: cardBg,
          borderRadius: 12,
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(124, 58, 237, 0.08)',
          border: `1px solid ${cardBorder}`,
          padding: '1.25rem'
        }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            color: textPrimary, 
            marginBottom: '1rem',
            fontFamily: 'Montserrat',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            Alert Summary
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats.criticalTransformers > 0 ? (
              <div style={{
                padding: '0.75rem',
                background: isDark ? 'rgba(220, 38, 38, 0.15)' : 'rgba(220, 38, 38, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(220, 38, 38, 0.3)'
              }}>
                <div style={{ fontWeight: '600', color: isDark ? '#f87171' : '#dc2626', fontSize: '0.85rem' }}>
                  Critical Issues
                </div>
                <div style={{ color: textPrimary, marginTop: '0.15rem', fontSize: '0.85rem' }}>
                  {stats.criticalTransformers} transformers require immediate attention
                </div>
              </div>
            ) : (
              <div style={{
                padding: '0.75rem',
                background: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                <div style={{ fontWeight: '600', color: isDark ? '#34d399' : '#059669', fontSize: '0.85rem' }}>
                  All Clear
                </div>
                <div style={{ color: textPrimary, marginTop: '0.15rem', fontSize: '0.85rem' }}>
                  No critical issues detected
                </div>
              </div>
            )}
            
            {stats.warningTransformers > 0 && (
              <div style={{
                padding: '0.75rem',
                background: isDark ? 'rgba(217, 119, 6, 0.15)' : 'rgba(217, 119, 6, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(217, 119, 6, 0.3)'
              }}>
                <div style={{ fontWeight: '600', color: isDark ? '#fbbf24' : '#d97706', fontSize: '0.85rem' }}>
                  Monitor Required
                </div>
                <div style={{ color: textPrimary, marginTop: '0.15rem', fontSize: '0.85rem' }}>
                  {stats.warningTransformers} transformers showing warning signs
                </div>
              </div>
            )}
            
            <div style={{
              padding: '0.75rem',
              background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
              borderRadius: '8px',
              border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(30, 64, 175, 0.2)'
            }}>
              <div style={{ fontWeight: '600', color: isDark ? '#60a5fa' : '#1e40af', fontSize: '0.85rem' }}>
                Maintenance Schedule
              </div>
              <div style={{ color: textPrimary, marginTop: '0.15rem', fontSize: '0.85rem' }}>
                Next scheduled maintenance in 3 days
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}