import DiscountModal from './DiscountModal';

export default function SurchargeModal(props){
  return (
    <DiscountModal
      title="Add Surcharge"
      confirmText="Add Surcharge"
      positive
      {...props}
    />
  );
}
