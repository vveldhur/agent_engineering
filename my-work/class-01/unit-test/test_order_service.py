import unittest
from unittest.mock import Mock, patch

from order_service import (
    Order,
    InventoryService,
    PaymentGateway,
    InventoryShortageError,
    PaymentFailedError,
    InvalidOrderError,
)


class TestOrderCartAndDiscounts(unittest.TestCase):
    def setUp(self):
        # Create dummy mock dependencies
        self.mock_inventory = Mock(spec=InventoryService)
        self.mock_payment = Mock(spec=PaymentGateway)
        # Create an Order instance
        self.order = Order(
            inventory_service=self.mock_inventory,
            payment_gateway=self.mock_payment,
            customer_email="alice@example.com",
            is_vip=False,
        )

    def test_add_item_success(self):
        self.order.add_item("prod_1", price=10.0, quantity=2)
        self.assertEqual(self.order.items["prod_1"], {"price": 10.0, "qty": 2})

    def test_add_item_negative_price_raises_value_error(self):
        with self.assertRaises(ValueError) as context:
            self.order.add_item("prod_1", price=-5.0, quantity=1)
        self.assertEqual(str(context.exception), "Price cannot be negative")

    def test_add_item_zero_or_negative_quantity_raises_value_error(self):
        with self.assertRaises(ValueError) as context:
            self.order.add_item("prod_1", price=10.0, quantity=0)
        self.assertEqual(str(context.exception), "Quantity must be greater than zero")

        with self.assertRaises(ValueError) as context:
            self.order.add_item("prod_1", price=10.0, quantity=-2)
        self.assertEqual(str(context.exception), "Quantity must be greater than zero")

    def test_add_item_existing_product_increments_quantity(self):
        self.order.add_item("prod_1", price=10.0, quantity=2)
        self.order.add_item("prod_1", price=10.0, quantity=3)
        self.assertEqual(self.order.items["prod_1"]["qty"], 5)

    def test_remove_item_success(self):
        self.order.add_item("prod_1", price=10.0, quantity=2)
        self.order.remove_item("prod_1")
        self.assertNotIn("prod_1", self.order.items)

    def test_remove_item_non_existent_does_not_raise(self):
        # Should not raise any exception
        self.order.remove_item("non_existent")

    def test_total_price_calculation(self):
        self.assertEqual(self.order.total_price, 0.0)
        self.order.add_item("prod_1", price=10.0, quantity=2)
        self.order.add_item("prod_2", price=15.5, quantity=1)
        # 10.0 * 2 + 15.5 * 1 = 35.5
        self.assertEqual(self.order.total_price, 35.5)

    def test_apply_discount_regular_under_threshold(self):
        # Regular customer total <= 100 (no discount)
        self.order.add_item("prod_1", price=50.0, quantity=2)  # Total = 100.0
        self.assertEqual(self.order.apply_discount(), 100.0)

    def test_apply_discount_regular_over_threshold(self):
        # Regular customer total > 100 (10% discount)
        self.order.add_item("prod_1", price=120.0, quantity=1)  # Total = 120.0
        # 120.0 * 0.9 = 108.0
        self.assertEqual(self.order.apply_discount(), 108.0)

    def test_apply_discount_vip_under_threshold(self):
        # VIP customer total <= 100 (20% discount)
        self.order.is_vip = True
        self.order.add_item("prod_1", price=50.0, quantity=1)  # Total = 50.0
        # 50.0 * 0.8 = 40.0
        self.assertEqual(self.order.apply_discount(), 40.0)

    def test_apply_discount_vip_over_threshold(self):
        # VIP customer total > 100 (20% discount)
        self.order.is_vip = True
        self.order.add_item("prod_1", price=200.0, quantity=1)  # Total = 200.0
        # 200.0 * 0.8 = 160.0
        self.assertEqual(self.order.apply_discount(), 160.0)


class TestOrderCheckoutFlow(unittest.TestCase):
    def setUp(self):
        self.mock_inventory = Mock(spec=InventoryService)
        self.mock_payment = Mock(spec=PaymentGateway)
        self.order = Order(
            inventory_service=self.mock_inventory,
            payment_gateway=self.mock_payment,
            customer_email="bob@example.com",
            is_vip=False,
        )

    def test_checkout_empty_cart_raises_invalid_order_error(self):
        with self.assertRaises(InvalidOrderError) as context:
            self.order.checkout()
        self.assertEqual(str(context.exception), "Cannot checkout an empty cart")
        # Ensure external services were not called
        self.mock_inventory.get_stock.assert_not_called()
        self.mock_payment.charge.assert_not_called()

    def test_checkout_insufficient_stock_raises_inventory_shortage_error(self):
        self.order.add_item("prod_1", price=50.0, quantity=3)
        # Mock stock check returning less than needed (2 < 3)
        self.mock_inventory.get_stock.return_value = 2

        with self.assertRaises(InventoryShortageError) as context:
            self.order.checkout()

        self.assertIn("Not enough stock for prod_1", str(context.exception))
        # Ensure stock check occurred
        self.mock_inventory.get_stock.assert_called_once_with("prod_1")
        # Ensure payment was NOT charged and stock was NOT decremented
        self.mock_payment.charge.assert_not_called()
        self.mock_inventory.decrement_stock.assert_not_called()

    def test_checkout_payment_declined_raises_payment_failed_error(self):
        self.order.add_item("prod_1", price=50.0, quantity=1)
        self.mock_inventory.get_stock.return_value = 10
        # Mock payment gateway declining transaction
        self.mock_payment.charge.return_value = False

        with self.assertRaises(PaymentFailedError) as context:
            self.order.checkout()

        self.assertEqual(str(context.exception), "Transaction declined by gateway")
        # Verify call order and state
        self.mock_inventory.get_stock.assert_called_once_with("prod_1")
        self.mock_payment.charge.assert_called_once_with(50.0, "USD")
        # Verify no stock decrement and order remains unpaid/draft
        self.mock_inventory.decrement_stock.assert_not_called()
        self.assertFalse(self.order.is_paid)
        self.assertEqual(self.order.status, "DRAFT")

    def test_checkout_payment_network_exception_wraps_in_payment_failed_error(self):
        self.order.add_item("prod_1", price=50.0, quantity=1)
        self.mock_inventory.get_stock.return_value = 10
        # Mock payment gateway throwing a network exception
        self.mock_payment.charge.side_effect = ConnectionError("Stripe API Timeout")

        with self.assertRaises(PaymentFailedError) as context:
            self.order.checkout()

        self.assertIn("Payment gateway error: Stripe API Timeout", str(context.exception))
        # Verify stock decrement did NOT run
        self.mock_inventory.decrement_stock.assert_not_called()
        self.assertFalse(self.order.is_paid)

    def test_checkout_success(self):
        self.order.add_item("prod_1", price=40.0, quantity=3)  # Total 120.0 -> Regular customer gets 10% off -> 108.0
        self.mock_inventory.get_stock.return_value = 5
        self.mock_payment.charge.return_value = True

        result = self.order.checkout()

        # Check return value
        self.assertEqual(result, {"status": "success", "charged_amount": 108.0})

        # Verify mock interactions
        self.mock_inventory.get_stock.assert_called_once_with("prod_1")
        self.mock_payment.charge.assert_called_once_with(108.0, "USD")
        self.mock_inventory.decrement_stock.assert_called_once_with("prod_1", 3)

        # Verify state update
        self.assertTrue(self.order.is_paid)
        self.assertEqual(self.order.status, "COMPLETED")


if __name__ == "__main__":
    unittest.main()
