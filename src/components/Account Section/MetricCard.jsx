import React from 'react';
import PropTypes from 'prop-types';
import { Activity, ChartLine, BicepsFlexed , Weight ,PersonStanding} from 'lucide-react';

const ICONS = {
  bmi: <Activity size={24} />,
  fat: <PersonStanding size={24} />,
  muscle: <BicepsFlexed  size={24} />,
  weight: <ChartLine size={24} />,
};

const MetricCard = ({ icon, title, value, status, statusType, onSelect, selected }) => {
  const IconComponent = ICONS[icon] || <Activity size={24} />;

  return (
    <div
      className={`metric-card-refreshed status-border-${statusType}${selected ? ' metric-card-selected' : ''}`}
      onClick={onSelect}
      style={{ cursor: onSelect ? 'pointer' : 'default', boxShadow: selected ? '0 0 0 2px #2563eb' : undefined }}
    >
      <div className="metric-card-header">
        <div className="metric-card-icon">{IconComponent}</div>
        <h6 className="metric-card-title">{title}</h6>
      </div>
      <p className={`metric-card-value text-${statusType}`}>{value}</p>
      <div className="metric-card-footer">
        <span className={`metric-card-status status-bg-${statusType}`}>{status}</span>
      </div>
    </div>
  );
};

MetricCard.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  statusType: PropTypes.oneOf(['success', 'warning', 'danger', 'default']).isRequired,
  onSelect: PropTypes.func,
  selected: PropTypes.bool,
};

export default MetricCard;